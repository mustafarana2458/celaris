import type { IconName } from "@/components/dashboard/nav-links";

// Super Admin Portal Phase 1: the 7 planned module sections, as
// placeholders only (see each app/admin/**/page.tsx -- all render
// PlaceholderPage, no module logic). Single source of truth for
// AdminSidebar's links and each placeholder page's title/description, so
// the two can't drift apart.
export type AdminNavItem = {
  label: string;
  href: string;
  icon: IconName;
  description: string;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    label: "Overview",
    href: "/admin",
    icon: "trending",
    description: "Platform-wide analytics and key metrics across every workspace.",
  },
  {
    label: "Workspaces",
    href: "/admin/workspaces",
    icon: "building",
    description: "Manage every workspace and account on the platform.",
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: "users",
    description: "Directory of every user across all workspaces -- password resets, session termination, suspension.",
  },
  {
    label: "AI Engine",
    href: "/admin/ai-engine",
    icon: "assistant",
    description: "Control AI model routing platform-wide (migrated from the workspace Dev Panel).",
  },
  {
    label: "Promo Codes",
    href: "/admin/promo-codes",
    icon: "check",
    description: "Generate and manage promo codes -- the redemption side already exists.",
  },
  {
    label: "Financials",
    href: "/admin/financials",
    icon: "invoice",
    description: "Lemon Squeezy and Safepay sync status and platform revenue.",
  },
  {
    label: "Audit Logs",
    href: "/admin/audit-logs",
    icon: "folder",
    description: "System-wide audit trail of admin and platform actions.",
  },
];
