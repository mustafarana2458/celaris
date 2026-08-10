"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NavIcon } from "@/components/dashboard/NavIcon";
import { RowActionsMenu, type RowAction } from "@/components/ui/RowActionsMenu";
import { useCanEdit } from "@/components/workspace/WorkspaceContext";
import { SegmentModal } from "./SegmentModal";
import { DeleteSegmentDialog } from "./DeleteSegmentDialog";
import { getInitials } from "@/lib/avatar";
import { tagColor } from "@/lib/tagColors";
import { downloadCsv } from "@/lib/csv";
import { resolveContactTagNames } from "@/lib/tags";
import { listSegmentsWithCounts, exportSegmentContacts } from "@/lib/actions/segments";
import type { Segment } from "@/lib/segments";
import type { Company, Tag, WorkspaceTeamMember } from "@/lib/types";

type SegmentWithCount = Segment & { matchCount: number };

export function SegmentsPageClient({
  initialSegments,
  companies,
  tags,
  teamMembers,
}: {
  initialSegments: SegmentWithCount[];
  companies: Pick<Company, "id" | "name">[];
  tags: Pick<Tag, "id" | "name">[];
  teamMembers: WorkspaceTeamMember[];
}) {
  const router = useRouter();
  const canEdit = useCanEdit("contacts", "segments");
  const [segments, setSegments] = useState(initialSegments);
  const [isPending, startTransition] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Segment | null>(null);
  const [deleting, setDeleting] = useState<Segment | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const memberByUserId = new Map(teamMembers.map((m) => [m.user_id, m]));

  function refresh() {
    setLoadError(null);
    startTransition(async () => {
      const result = await listSegmentsWithCounts();
      if ("error" in result) {
        setLoadError(result.error);
        return;
      }
      setSegments(result.segments);
    });
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(segment: Segment) {
    setEditing(segment);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleSaved() {
    closeModal();
    refresh();
  }

  function handleDeleted() {
    setDeleting(null);
    refresh();
  }

  async function handleExport(segment: Segment) {
    setExportError(null);
    setExportingId(segment.id);
    const result = await exportSegmentContacts(segment.query_logic);
    setExportingId(null);
    if ("error" in result) {
      setExportError(result.error);
      return;
    }

    const rows = result.contacts.map((c) => [
      c.name,
      c.email ?? "",
      c.phone ?? "",
      c.companies?.name ?? c.company ?? "",
      c.type,
      resolveContactTagNames(c).join("; "),
      new Date(c.created_at).toLocaleDateString(),
    ]);

    downloadCsv(
      `${segment.name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Name", "Email", "Phone", "Company", "Type", "Tags", "Created"],
      rows
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Segments</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Save filter rules once — segments stay up to date as your contacts change.
          </p>
        </div>
        {canEdit && <Button onClick={openCreate}>+ Create Segment</Button>}
      </div>

      {(loadError || exportError) && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {loadError || exportError}
        </div>
      )}

      {segments.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent">
            <NavIcon name="users" className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No segments yet</p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Create a segment to automatically group contacts by rules like tags, type, or company.
          </p>
          {canEdit && (
            <Button onClick={openCreate} className="mt-1">
              + Create Segment
            </Button>
          )}
        </div>
      ) : (
        <div
          className={`overflow-hidden rounded-2xl border border-slate-200 bg-white transition-opacity dark:border-slate-700 dark:bg-slate-800 ${
            isPending ? "opacity-60" : "opacity-100"
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Segment Name</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Contacts</th>
                  <th className="px-5 py-3 font-medium">Created By</th>
                  <th className="px-5 py-3 font-medium">Last Updated</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {segments.map((segment) => {
                  const creator = segment.created_by ? memberByUserId.get(segment.created_by) : null;
                  const creatorName = creator?.full_name || creator?.email || "Unknown";
                  return (
                    <tr key={segment.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                        <Link
                          href={`/dashboard/contacts/segments/${segment.id}`}
                          className="hover:text-accent hover:underline"
                        >
                          {segment.name}
                        </Link>
                      </td>
                      <td className="max-w-xs truncate px-5 py-3 text-slate-600 dark:text-slate-300">
                        {segment.description || "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                        {segment.matchCount}
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${tagColor(creatorName).dot}`}
                          >
                            {getInitials(creatorName)}
                          </span>
                          {creatorName}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                        {new Date(segment.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          <RowActionsMenu
                            ariaLabel={`Actions for ${segment.name}`}
                            actions={[
                              {
                                label: "View Segment",
                                icon: Eye,
                                onClick: () => router.push(`/dashboard/contacts/segments/${segment.id}`),
                              },
                              ...(canEdit
                                ? [{ label: "Edit Rules", icon: Pencil, onClick: () => openEdit(segment) } satisfies RowAction]
                                : []),
                              {
                                label: exportingId === segment.id ? "Exporting..." : "Export to CSV",
                                icon: Download,
                                onClick: () => handleExport(segment),
                              },
                              ...(canEdit
                                ? [
                                    {
                                      label: "Delete",
                                      icon: Trash2,
                                      destructive: true,
                                      onClick: () => setDeleting(segment),
                                    } satisfies RowAction,
                                  ]
                                : []),
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SegmentModal
        open={modalOpen}
        onClose={closeModal}
        segment={editing}
        companies={companies}
        tags={tags}
        onSaved={handleSaved}
      />

      <DeleteSegmentDialog segment={deleting} onClose={() => setDeleting(null)} onDeleted={handleDeleted} />
    </div>
  );
}
