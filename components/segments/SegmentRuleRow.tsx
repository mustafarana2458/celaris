"use client";

import { X } from "lucide-react";
import {
  SEGMENT_FIELDS,
  SEGMENT_TYPE_OPTIONS,
  segmentFieldDef,
  type SegmentFieldKey,
  type SegmentOperator,
  type SegmentRule,
} from "@/lib/segments";
import type { Company, Tag } from "@/lib/types";

const selectClass =
  "rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

export function SegmentRuleRow({
  rule,
  onChange,
  onRemove,
  companies,
  tags,
  removable,
}: {
  rule: SegmentRule;
  onChange: (rule: SegmentRule) => void;
  onRemove: () => void;
  companies: Pick<Company, "id" | "name">[];
  tags: Pick<Tag, "id" | "name">[];
  removable: boolean;
}) {
  const fieldDef = segmentFieldDef(rule.field);

  function handleFieldChange(field: SegmentFieldKey) {
    const nextDef = segmentFieldDef(field);
    onChange({ field, operator: nextDef.operators[0].value, value: "" });
  }

  function handleOperatorChange(operator: SegmentOperator) {
    onChange({ ...rule, operator });
  }

  function handleValueChange(value: string) {
    onChange({ ...rule, value });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <select
        value={rule.field}
        onChange={(e) => handleFieldChange(e.target.value as SegmentFieldKey)}
        className={`${selectClass} sm:w-32`}
        aria-label="Field"
      >
        {SEGMENT_FIELDS.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        value={rule.operator}
        onChange={(e) => handleOperatorChange(e.target.value as SegmentOperator)}
        className={`${selectClass} sm:w-40`}
        aria-label="Operator"
      >
        {fieldDef.operators.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      {fieldDef.valueType === "text" ? (
        <input
          type="text"
          value={rule.value}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder="Value..."
          className={`${selectClass} flex-1`}
          aria-label="Value"
        />
      ) : rule.field === "type" ? (
        <select
          value={rule.value}
          onChange={(e) => handleValueChange(e.target.value)}
          className={`${selectClass} flex-1`}
          aria-label="Value"
        >
          <option value="">Select...</option>
          {SEGMENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : rule.field === "tag" ? (
        <select
          value={rule.value}
          onChange={(e) => handleValueChange(e.target.value)}
          className={`${selectClass} flex-1`}
          aria-label="Value"
        >
          <option value="">Select a tag...</option>
          {tags.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      ) : (
        <select
          value={rule.value}
          onChange={(e) => handleValueChange(e.target.value)}
          className={`${selectClass} flex-1`}
          aria-label="Value"
        >
          <option value="">Select a company...</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={onRemove}
        disabled={!removable}
        aria-label="Remove condition"
        className="flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-red-400 sm:self-auto"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
