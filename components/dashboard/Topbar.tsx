import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { ProfileDropdown } from "./ProfileDropdown";
import type { WorkspaceSummary } from "@/lib/workspace";

export function Topbar({
  fullName,
  avatarUrl,
  activeWorkspace,
  workspaces,
  onMenuClick,
}: {
  fullName: string;
  avatarUrl: string | null;
  activeWorkspace: { id: string; name: string; logoUrl: string | null } | null;
  workspaces: WorkspaceSummary[];
  onMenuClick?: () => void;
}) {
  return (
    <header className="flex h-16 items-center justify-between bg-white px-4 shadow-sm md:px-6 dark:bg-slate-800">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden dark:text-slate-400 dark:hover:bg-slate-700"
          aria-label="Open menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <WorkspaceSwitcher activeWorkspace={activeWorkspace} workspaces={workspaces} />
      </div>

      <ProfileDropdown fullName={fullName} avatarUrl={avatarUrl} />
    </header>
  );
}
