"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { DealModal } from "./DealModal";
import { DeleteDealDialog } from "./DeleteDealDialog";
import { DealForecast } from "./DealForecast";
import { DealsKanban } from "./DealsKanban";
import { DealsTable } from "./DealsTable";
import { PipelineSwitcher } from "./PipelineSwitcher";
import { DealsTabs } from "./DealsTabs";
import { scoreDeal, updateDealStage } from "@/lib/actions/deals";
import type { Company, Contact, Deal, DealStage, Pipeline, WorkspaceTeamMember } from "@/lib/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

type ViewMode = "kanban" | "list";

function defaultPipelineId(pipelines: Pipeline[]): string | null {
  return pipelines.find((p) => p.is_default)?.id ?? pipelines[0]?.id ?? null;
}

export function DealsPageClient({
  initialDeals,
  contacts,
  companies,
  initialPipelines,
  members,
  currentUserId,
  loadError,
}: {
  initialDeals: Deal[];
  contacts: Pick<Contact, "id" | "name">[];
  companies: Pick<Company, "id" | "name">[];
  initialPipelines: Pipeline[];
  members: WorkspaceTeamMember[];
  currentUserId: string;
  loadError?: string | null;
}) {
  const router = useRouter();
  const [deals, setDeals] = useState(initialDeals);
  const [pipelines, setPipelines] = useState(initialPipelines);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(() =>
    defaultPipelineId(initialPipelines)
  );
  const [view, setView] = useState<ViewMode>("kanban");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [deleting, setDeleting] = useState<Deal | null>(null);
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [scoreReasons, setScoreReasons] = useState<Record<string, string>>({});
  const [scoreErrors, setScoreErrors] = useState<Record<string, string>>({});
  const [stageError, setStageError] = useState<string | null>(null);

  useEffect(() => {
    setDeals(initialDeals);
  }, [initialDeals]);

  useEffect(() => {
    setPipelines(initialPipelines);
    setSelectedPipelineId((current) =>
      current && initialPipelines.some((p) => p.id === current)
        ? current
        : defaultPipelineId(initialPipelines)
    );
  }, [initialPipelines]);

  const pipelineDeals = useMemo(
    () => deals.filter((d) => d.pipeline_id === selectedPipelineId),
    [deals, selectedPipelineId]
  );

  const totalValue = useMemo(
    () => pipelineDeals.reduce((sum, d) => sum + (d.value ?? 0), 0),
    [pipelineDeals]
  );

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(deal: Deal) {
    setEditing(deal);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleSaved() {
    closeModal();
    router.refresh();
  }

  function handleDeleted() {
    setDeleting(null);
    router.refresh();
  }

  function handlePipelineCreated(pipeline: { id: string; name: string; is_default: boolean }) {
    setPipelines((prev) => [...prev, { ...pipeline, workspace_id: "", created_at: new Date().toISOString() }]);
    setSelectedPipelineId(pipeline.id);
    router.refresh();
  }

  async function handleStageChange(deal: Deal, stage: DealStage) {
    setStageError(null);
    const previousStage = deal.stage;
    setDeals((prev) => prev.map((d) => (d.id === deal.id ? { ...d, stage } : d)));

    const result = await updateDealStage(deal.id, stage);
    if (result.error) {
      setDeals((prev) => prev.map((d) => (d.id === deal.id ? { ...d, stage: previousStage } : d)));
      setStageError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleScore(deal: Deal) {
    setScoringId(deal.id);
    setScoreErrors((prev) => ({ ...prev, [deal.id]: "" }));
    const result = await scoreDeal(deal.id);
    setScoringId(null);

    if (result.error) {
      setScoreErrors((prev) => ({ ...prev, [deal.id]: result.error! }));
      return;
    }

    setScoreReasons((prev) => ({ ...prev, [deal.id]: result.reason ?? "" }));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <DealsTabs />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Deals</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {pipelineDeals.length} deal{pipelineDeals.length === 1 ? "" : "s"} ·{" "}
            {currency.format(totalValue)} in pipeline
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PipelineSwitcher
            pipelines={pipelines}
            activePipelineId={selectedPipelineId}
            onSwitch={setSelectedPipelineId}
            onCreated={handlePipelineCreated}
          />
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-700">
            {(["kanban", "list"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  view === mode
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <Button onClick={openAdd}>+ Add deal</Button>
        </div>
      </div>

      <DealForecast deals={pipelineDeals} />

      {loadError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          Couldn&apos;t load deals: {loadError}
        </div>
      )}

      {stageError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          Couldn&apos;t move that deal: {stageError}
        </div>
      )}

      {pipelineDeals.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No deals yet</p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Add your first deal to start tracking your sales pipeline.
          </p>
          <Button onClick={openAdd} className="mt-1">
            + Add deal
          </Button>
        </div>
      ) : view === "kanban" ? (
        <DealsKanban
          deals={pipelineDeals}
          onStageChange={handleStageChange}
          onEdit={openEdit}
          onDelete={setDeleting}
          onScore={handleScore}
          scoringId={scoringId}
          scoreReasons={scoreReasons}
          scoreErrors={scoreErrors}
        />
      ) : (
        <DealsTable deals={pipelineDeals} onEdit={openEdit} onDelete={setDeleting} />
      )}

      <DealModal
        open={modalOpen}
        onClose={closeModal}
        deal={editing}
        contacts={contacts}
        companies={companies}
        pipelines={pipelines}
        members={members}
        currentUserId={currentUserId}
        defaultPipelineId={selectedPipelineId}
        onSaved={handleSaved}
      />

      <DeleteDealDialog
        deal={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
