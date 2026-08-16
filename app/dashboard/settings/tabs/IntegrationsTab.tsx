"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ComingSoonToast, useComingSoonToast } from "./ComingSoonToast";

function IconTile({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
      style={{ backgroundColor: color }}
    >
      {children}
    </div>
  );
}

function GoogleCalendarIcon() {
  return (
    <IconTile color="#4285F4">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
        <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
        <path strokeLinecap="round" d="M3.5 9.5h17M8 3v3M16 3v3" />
        <circle cx="12" cy="14.5" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    </IconTile>
  );
}

function OutlookIcon() {
  return (
    <IconTile color="#0078D4">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    </IconTile>
  );
}

function StripeIcon() {
  return (
    <IconTile color="#635BFF">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path strokeLinecap="round" d="M3 10h18" />
        <path strokeLinecap="round" d="M7 14.5h4" />
      </svg>
    </IconTile>
  );
}

function SlackIcon() {
  return (
    <IconTile color="#4A154B">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
        <path strokeLinecap="round" d="M9 3.5v6M15 3.5v6M9 14.5v6M15 14.5v6M3.5 9h6M14.5 9h6M3.5 15h6M14.5 15h6" />
      </svg>
    </IconTile>
  );
}

function ZoomIcon() {
  return (
    <IconTile color="#2D8CFF">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
        <rect x="3" y="7" width="12" height="10" rx="2.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m15 10.5 6-3v9l-6-3" />
      </svg>
    </IconTile>
  );
}

type Integration = {
  id: string;
  name: string;
  description: string;
  icon: () => ReactNode;
};

const INTEGRATIONS: Integration[] = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sync your meetings and tasks to your Google Calendar.",
    icon: GoogleCalendarIcon,
  },
  {
    id: "outlook",
    name: "Outlook Calendar",
    description: "Keep your Outlook calendar in sync with Celaris events.",
    icon: OutlookIcon,
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Accept online payments and sync invoice status automatically.",
    icon: StripeIcon,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get deal, task, and invoice notifications posted straight to Slack.",
    icon: SlackIcon,
  },
  {
    id: "zoom",
    name: "Zoom",
    description: "Auto-generate meeting links for scheduled calls and events.",
    icon: ZoomIcon,
  },
];

export function IntegrationsTab() {
  const { message, showToast } = useComingSoonToast();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Integrations</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Connect email, calendar, and third-party tools to supercharge your workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((integration) => {
          const Icon = integration.icon;
          return (
            <div
              key={integration.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-start justify-between gap-3">
                <Icon />
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                  Disconnected
                </span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{integration.name}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{integration.description}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="mt-auto"
                onClick={() => showToast(`${integration.name} integration coming soon.`)}
              >
                Connect
              </Button>
            </div>
          );
        })}
      </div>

      <ComingSoonToast message={message} />
    </div>
  );
}
