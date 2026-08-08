import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireModuleAccess } from "@/lib/permissions";
import { previewSegmentContacts } from "@/lib/actions/segments";
import { SegmentDetailClient } from "@/components/segments/SegmentDetailClient";
import { DEFAULT_PAGE_SIZE } from "@/lib/types";
import type { Segment } from "@/lib/segments";
import type { Company, Tag } from "@/lib/types";

export default async function SegmentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  if (!workspace) {
    notFound();
  }
  requireModuleAccess(workspace, "contacts");

  const { data: segment } = await supabase
    .from("segments")
    .select("*")
    .eq("id", params.id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!segment) {
    notFound();
  }

  const typedSegment = segment as Segment;

  const [preview, { data: companies }, { data: tags }] = await Promise.all([
    previewSegmentContacts(typedSegment.query_logic, { pageSize: DEFAULT_PAGE_SIZE }),
    supabase
      .from("companies")
      .select("id, name")
      .eq("workspace_id", workspace.id)
      .order("name", { ascending: true }),
    supabase
      .from("tags")
      .select("id, name")
      .eq("workspace_id", workspace.id)
      .order("name", { ascending: true }),
  ]);

  const { contacts: initialContacts, total: initialTotal } =
    "error" in preview ? { contacts: [], total: 0 } : preview;

  return (
    <SegmentDetailClient
      segment={typedSegment}
      initialContacts={initialContacts}
      initialTotal={initialTotal}
      companies={(companies as Pick<Company, "id" | "name">[]) ?? []}
      tags={(tags as Pick<Tag, "id" | "name">[]) ?? []}
    />
  );
}
