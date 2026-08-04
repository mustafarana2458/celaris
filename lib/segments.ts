import type { SupabaseClient } from "@supabase/supabase-js";

export type SegmentFieldKey = "type" | "tag" | "company" | "location";
export type SegmentOperator = "equals" | "not_equals" | "contains" | "not_contains";
export type SegmentMatchMode = "all" | "any";

export type SegmentRule = {
  field: SegmentFieldKey;
  operator: SegmentOperator;
  value: string;
};

export type SegmentQueryLogic = {
  match: SegmentMatchMode;
  rules: SegmentRule[];
};

export type Segment = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  query_logic: SegmentQueryLogic;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type SegmentFieldDef = {
  key: SegmentFieldKey;
  label: string;
  valueType: "select" | "text";
  operators: { value: SegmentOperator; label: string }[];
};

// contacts has no location column of its own -- "Location" filters on the
// linked company's free-text location field via contacts.company_id.
export const SEGMENT_FIELDS: SegmentFieldDef[] = [
  {
    key: "type",
    label: "Type",
    valueType: "select",
    operators: [
      { value: "equals", label: "Equals" },
      { value: "not_equals", label: "Not equals" },
    ],
  },
  {
    key: "tag",
    label: "Tag",
    valueType: "select",
    operators: [
      { value: "contains", label: "Contains" },
      { value: "not_contains", label: "Does not contain" },
    ],
  },
  {
    key: "company",
    label: "Company",
    valueType: "select",
    operators: [
      { value: "equals", label: "Equals" },
      { value: "not_equals", label: "Not equals" },
    ],
  },
  {
    key: "location",
    label: "Location",
    valueType: "text",
    operators: [
      { value: "contains", label: "Contains" },
      { value: "not_contains", label: "Does not contain" },
    ],
  },
];

export const SEGMENT_TYPE_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "customer", label: "Customer" },
];

export function segmentFieldDef(field: SegmentFieldKey): SegmentFieldDef {
  return SEGMENT_FIELDS.find((f) => f.key === field) ?? SEGMENT_FIELDS[0];
}

export function emptyRule(): SegmentRule {
  return { field: "type", operator: "equals", value: "" };
}

// Escapes ILIKE wildcards so a literal value like "50%" isn't treated as a
// pattern.
function escapeIlike(value: string): string {
  return value.replace(/[%_]/g, (m) => `\\${m}`);
}

const NEGATIVE_OPERATORS = new Set<SegmentOperator>(["not_equals", "not_contains"]);

async function allContactIds(supabase: SupabaseClient, workspaceId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from("contacts").select("id").eq("workspace_id", workspaceId);
  if (error) throw error;
  return new Set((data as { id: string }[] | null ?? []).map((c) => c.id));
}

// Resolves the "positive" form of a rule (equals / contains) to a set of
// matching contact ids. All queries go through Supabase's parameterized
// filter builder (.eq/.in/.ilike) -- no raw string concatenation into SQL.
async function positiveMatchIds(
  supabase: SupabaseClient,
  workspaceId: string,
  rule: SegmentRule
): Promise<Set<string>> {
  const value = rule.value.trim();
  if (!value) return new Set();

  if (rule.field === "type") {
    const { data, error } = await supabase
      .from("contacts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("type", value);
    if (error) throw error;
    return new Set((data as { id: string }[] | null ?? []).map((c) => c.id));
  }

  if (rule.field === "company") {
    const { data, error } = await supabase
      .from("contacts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("company_id", value);
    if (error) throw error;
    return new Set((data as { id: string }[] | null ?? []).map((c) => c.id));
  }

  if (rule.field === "tag") {
    const { data: tagRow } = await supabase
      .from("tags")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("name", value)
      .maybeSingle<{ id: string }>();
    if (!tagRow) return new Set();

    const { data, error } = await supabase
      .from("contact_tags")
      .select("contact_id")
      .eq("workspace_id", workspaceId)
      .eq("tag_id", tagRow.id);
    if (error) throw error;
    return new Set((data as { contact_id: string }[] | null ?? []).map((c) => c.contact_id));
  }

  // location: contacts whose linked company's location contains the value
  const { data: companyRows, error: companyError } = await supabase
    .from("companies")
    .select("id")
    .eq("workspace_id", workspaceId)
    .ilike("location", `%${escapeIlike(value)}%`);
  if (companyError) throw companyError;

  const companyIds = (companyRows as { id: string }[] | null ?? []).map((c) => c.id);
  if (companyIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from("contacts")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("company_id", companyIds);
  if (error) throw error;
  return new Set((data as { id: string }[] | null ?? []).map((c) => c.id));
}

function intersect(a: Set<string>, b: Set<string>): Set<string> {
  const result = new Set<string>();
  a.forEach((id) => {
    if (b.has(id)) result.add(id);
  });
  return result;
}

// Converts a segment's stored query_logic into the set of matching contact
// ids, workspace-scoped throughout. "not_*" operators are resolved as the
// complement of the positive match against every contact id in the
// workspace, which sidesteps SQL NULL-comparison surprises (e.g. a contact
// with no company correctly counts as "company not_equals X").
export async function resolveSegmentContactIds(
  supabase: SupabaseClient,
  workspaceId: string,
  queryLogic: SegmentQueryLogic
): Promise<string[]> {
  const rules = queryLogic.rules.filter((r) => r.value.trim());
  if (rules.length === 0) return [];

  const needsComplement = rules.some((r) => NEGATIVE_OPERATORS.has(r.operator));
  const universe = needsComplement ? await allContactIds(supabase, workspaceId) : null;

  const ruleSets = await Promise.all(
    rules.map(async (rule) => {
      const positive = await positiveMatchIds(supabase, workspaceId, rule);
      if (!NEGATIVE_OPERATORS.has(rule.operator)) return positive;
      const complement = new Set<string>();
      universe!.forEach((id) => {
        if (!positive.has(id)) complement.add(id);
      });
      return complement;
    })
  );

  if (queryLogic.match === "any") {
    const union = new Set<string>();
    ruleSets.forEach((set) => set.forEach((id) => union.add(id)));
    return Array.from(union);
  }

  return Array.from(ruleSets.reduce((acc, set) => intersect(acc, set)));
}
