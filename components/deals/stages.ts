import type { DealStage } from "@/lib/types";

export const STAGES: {
  value: DealStage;
  label: string;
  column: string;
}[] = [
  { value: "new", label: "New", column: "border-t-slate-400" },
  { value: "qualified", label: "Qualified", column: "border-t-blue-400" },
  { value: "proposal", label: "Proposal", column: "border-t-amber-400" },
  { value: "won", label: "Won", column: "border-t-emerald-400" },
  { value: "lost", label: "Lost", column: "border-t-rose-400" },
];
