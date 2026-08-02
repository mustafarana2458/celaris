import type { DealStage } from "@/lib/types";

export const STAGES: {
  value: DealStage;
  label: string;
  column: string;
  badge: string;
}[] = [
  {
    value: "new",
    label: "New",
    column: "border-t-slate-400",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  },
  {
    value: "qualified",
    label: "Qualified",
    column: "border-t-blue-400",
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  },
  {
    value: "proposal",
    label: "Proposal",
    column: "border-t-amber-400",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  },
  {
    value: "won",
    label: "Won",
    column: "border-t-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  {
    value: "lost",
    label: "Lost",
    column: "border-t-rose-400",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
  },
];

export const STAGE_PROBABILITY: Record<DealStage, number> = {
  new: 0.1,
  qualified: 0.35,
  proposal: 0.65,
  won: 1,
  lost: 0,
};
