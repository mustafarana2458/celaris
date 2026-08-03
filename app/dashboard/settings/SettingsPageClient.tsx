"use client";

import { SVGProps, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CurrentWorkspace } from "@/lib/workspace";
import type { UserProfile } from "@/lib/types";
import type { WorkspaceBranding } from "./page";
import { ProfileTab } from "./tabs/ProfileTab";
import { WorkspaceTab } from "./tabs/WorkspaceTab";
import { AppearanceTab } from "./tabs/AppearanceTab";
import { ComingSoonTab } from "./tabs/ComingSoonTab";

type TabId =
  | "profile"
  | "workspace"
  | "appearance"
  | "modules"
  | "integrations"
  | "billing"
  | "about";

const TAB_ICON_PATHS: Record<TabId, string> = {
  profile:
    "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-8 8a6 6 0 0 0-6 6h16a6 6 0 0 0-6-6H8Z",
  workspace:
    "M4 21V7l8-4 8 4v14M9 21v-6h6v6M4 21h16",
  appearance:
    "M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4c1.9 0 3.6-1.6 3.6-3.5C21 6.9 17 3 12 3Z",
  modules: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
  integrations:
    "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18M3 9v10a2 2 0 0 0 2 2h4M21 9v10a2 2 0 0 1-2 2h-4",
  billing:
    "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 3h18",
  about:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13h.01M11 11h1v6h1",
};

function TabIcon({ id, ...props }: { id: TabId } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d={TAB_ICON_PATHS[id]} />
    </svg>
  );
}

const TABS: { id: TabId; label: string; soon?: boolean }[] = [
  { id: "profile", label: "Profile & Account" },
  { id: "workspace", label: "Workspace & Branding" },
  { id: "appearance", label: "Appearance" },
  { id: "modules", label: "Module Preferences", soon: true },
  { id: "integrations", label: "Integrations", soon: true },
  { id: "billing", label: "Billing", soon: true },
  { id: "about", label: "About & Legal", soon: true },
];

export function SettingsPageClient({
  email,
  profile,
  workspace,
  workspaceBranding,
}: {
  email: string;
  profile: UserProfile | null;
  workspace: CurrentWorkspace | null;
  workspaceBranding: WorkspaceBranding | null;
}) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = TABS.some((tab) => tab.id === requestedTab) ? (requestedTab as TabId) : "profile";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your account, workspace, and app preferences.
        </p>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <nav className="flex gap-1 overflow-x-auto md:w-64 md:shrink-0 md:flex-col md:overflow-visible">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors md:shrink ${
                  isActive
                    ? "bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                }`}
              >
                <TabIcon id={tab.id} className="h-5 w-5 shrink-0" />
                <span className="whitespace-nowrap md:whitespace-normal">
                  {tab.label}
                </span>
                {tab.soon && (
                  <span className="ml-auto hidden shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-normal text-slate-500 md:inline-block dark:bg-slate-700 dark:text-slate-400">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1">
          {activeTab === "profile" && (
            <ProfileTab email={email} profile={profile} />
          )}
          {activeTab === "workspace" && (
            <WorkspaceTab workspace={workspace} branding={workspaceBranding} />
          )}
          {activeTab === "appearance" && <AppearanceTab />}
          {activeTab === "modules" && (
            <ComingSoonTab
              title="Module Preferences"
              description="Enable or disable CRM modules like Deals, Projects, and Invoices per workspace."
            />
          )}
          {activeTab === "integrations" && (
            <ComingSoonTab
              title="Integrations"
              description="Connect email, calendar, and third-party tools to your workspace."
            />
          )}
          {activeTab === "billing" && (
            <ComingSoonTab
              title="Billing"
              description="Manage your subscription plan, payment method, and invoices."
            />
          )}
          {activeTab === "about" && (
            <ComingSoonTab
              title="About & Legal"
              description="App version, terms, privacy policy, and support links."
            />
          )}
        </div>
      </div>
    </div>
  );
}
