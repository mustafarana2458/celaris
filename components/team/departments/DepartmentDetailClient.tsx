"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SetBreadcrumbLabel } from "@/components/dashboard/BreadcrumbContext";
import { DepartmentMembersList } from "./DepartmentMembersList";
import { AddDepartmentMemberSearch } from "./AddDepartmentMemberSearch";
import { assigneeKey } from "@/lib/assignee";
import type { Department, DepartmentMember, TeamMember, WorkspaceTeamMember } from "@/lib/types";

export function DepartmentDetailClient({
  department,
  initialMembers,
  workspaceMembers,
  directory,
  canManage,
}: {
  department: Department;
  initialMembers: DepartmentMember[];
  workspaceMembers: WorkspaceTeamMember[];
  directory: Pick<TeamMember, "id" | "member_name">[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  const existingKeys = new Set(
    members
      .map((m) =>
        m.user_id
          ? assigneeKey("user", m.user_id)
          : m.team_member_id
            ? assigneeKey("directory", m.team_member_id)
            : null
      )
      .filter((key): key is string => key !== null)
  );

  function handleAdded() {
    router.refresh();
  }

  function handleRemoved(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <SetBreadcrumbLabel label={department.department_name} />

      <div>
        <Link
          href="/dashboard/team/departments"
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All departments
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {department.department_name}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {members.length} member{members.length === 1 ? "" : "s"}
        </p>
      </div>

      {canManage && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Add a member</h2>
          <AddDepartmentMemberSearch
            departmentId={department.id}
            workspaceMembers={workspaceMembers}
            directory={directory}
            existingKeys={existingKeys}
            onAdded={handleAdded}
          />
        </div>
      )}

      <DepartmentMembersList
        departmentId={department.id}
        members={members}
        canManage={canManage}
        onRemoved={handleRemoved}
      />
    </div>
  );
}
