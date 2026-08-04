"use client";

import { useEffect, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { SegmentRuleRow } from "./SegmentRuleRow";
import { createSegment, updateSegment } from "@/lib/actions/segments";
import { emptyRule, type Segment, type SegmentMatchMode, type SegmentRule } from "@/lib/segments";
import type { Company, Tag } from "@/lib/types";

export function SegmentModal({
  open,
  onClose,
  segment,
  companies,
  tags,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  segment: Segment | null;
  companies: Pick<Company, "id" | "name">[];
  tags: Pick<Tag, "id" | "name">[];
  onSaved: (segment: Segment) => void;
}) {
  const isEdit = !!segment;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [match, setMatch] = useState<SegmentMatchMode>("all");
  const [rules, setRules] = useState<SegmentRule[]>([emptyRule()]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setName(segment?.name ?? "");
    setDescription(segment?.description ?? "");
    setMatch(segment?.query_logic.match ?? "all");
    setRules(segment?.query_logic.rules.length ? segment.query_logic.rules : [emptyRule()]);
    setError(null);
  }, [open, segment]);

  function updateRule(index: number, next: SegmentRule) {
    setRules((prev) => prev.map((r, i) => (i === index ? next : r)));
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }

  function addRule() {
    setRules((prev) => [...prev, emptyRule()]);
  }

  function handleSubmit() {
    setError(null);
    if (!name.trim()) {
      setError("Segment name is required.");
      return;
    }
    if (rules.length === 0 || rules.some((r) => !r.value.trim())) {
      setError("Every condition needs a value. Remove empty conditions or fill them in.");
      return;
    }

    const queryLogic = { match, rules };

    startTransition(async () => {
      const result = isEdit
        ? await updateSegment(segment!.id, name, description, queryLogic)
        : await createSegment(name, description, queryLogic);

      if (result.error || !result.segment) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      onSaved(result.segment);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit segment" : "Create segment"}>
      <div className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <Input
          label="Segment Name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Textarea
          label="Description"
          name="description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Filter Criteria
            </span>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 text-xs font-medium dark:border-slate-600">
              {(["all", "any"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMatch(m)}
                  className={`rounded-md px-2.5 py-1 transition-colors ${
                    match === m
                      ? "bg-accent text-white"
                      : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                  }`}
                >
                  Match {m === "all" ? "ALL" : "ANY"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {rules.map((rule, index) => (
              <SegmentRuleRow
                key={index}
                rule={rule}
                onChange={(next) => updateRule(index, next)}
                onRemove={() => removeRule(index)}
                companies={companies}
                tags={tags}
                removable={rules.length > 1}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addRule}
            className="self-start rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            + Add Condition
          </button>
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" loading={isPending} onClick={handleSubmit}>
            {isEdit ? "Save changes" : "Create Segment"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
