export type IconName =
  | "home"
  | "users"
  | "building"
  | "trending"
  | "folder"
  | "check"
  | "invoice"
  | "team"
  | "assistant"
  | "settings";

export type NavLink = {
  type: "link";
  href: string;
  label: string;
  icon: IconName;
  badge?: string;
  moduleKey: string;
};

export type NavGroupChild = { href: string; label: string; submoduleKey?: string };

export type NavGroup = {
  type: "group";
  label: string;
  icon: IconName;
  moduleKey: string;
  children: NavGroupChild[];
};

export type NavItem = NavLink | NavGroup;

export const navLinks: NavItem[] = [
  { type: "link", href: "/dashboard", label: "Dashboard", icon: "home", moduleKey: "dashboard" },
  {
    type: "group",
    label: "Contacts",
    icon: "users",
    moduleKey: "contacts",
    children: [
      { href: "/dashboard/contacts", label: "People" },
      { href: "/dashboard/companies", label: "Companies" },
      { href: "/dashboard/contacts/segments", label: "Segments" },
    ],
  },
  {
    type: "group",
    label: "Deals",
    icon: "trending",
    moduleKey: "deals",
    children: [
      { href: "/dashboard/deals", label: "Pipelines" },
      { href: "/dashboard/deals/forecasts", label: "Forecasts" },
    ],
  },
  {
    type: "group",
    label: "Projects",
    icon: "folder",
    moduleKey: "projects",
    children: [
      { href: "/dashboard/projects", label: "All Projects" },
      { href: "/dashboard/projects/templates", label: "Project Templates" },
      { href: "/dashboard/projects/milestones", label: "Milestones & Timeline" },
    ],
  },
  {
    type: "group",
    label: "Tasks",
    icon: "check",
    moduleKey: "tasks",
    children: [
      { href: "/dashboard/tasks", label: "My Tasks" },
      { href: "/dashboard/tasks/team-board", label: "Team Board" },
      { href: "/dashboard/tasks/workload", label: "Workload" },
    ],
  },
  {
    type: "group",
    label: "Invoices",
    icon: "invoice",
    moduleKey: "invoices",
    children: [
      { href: "/dashboard/invoices", label: "All Invoices" },
      { href: "/dashboard/invoices/recurring", label: "Recurring Billing", submoduleKey: "recurring_billing" },
      { href: "/dashboard/invoices/product-library", label: "Product Library", submoduleKey: "product_library" },
    ],
  },
  {
    type: "group",
    label: "Team",
    icon: "team",
    moduleKey: "team",
    children: [
      { href: "/dashboard/team", label: "Active Members" },
      { href: "/dashboard/team", label: "Pending Invites" },
      { href: "/dashboard/team/departments", label: "Departments" },
    ],
  },
  { type: "link", href: "/dashboard/assistant", label: "AI Assistant", icon: "assistant", moduleKey: "ai_assistant" },
  { type: "link", href: "/dashboard/settings", label: "Settings", icon: "settings", moduleKey: "settings" },
];

// A route "matches" a nav href if it's an exact match, or a proper
// path-segment descendant of it (so a dynamic detail route like
// /dashboard/projects/123 still resolves to "All Projects"). Among all
// matches, the longest (most specific) one wins, so exactly one nav leaf is
// ever considered active even when two entries share an href.
function hrefMatchesPathname(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getActiveHref(pathname: string): string | null {
  return navLinks
    .flatMap((item) => (item.type === "group" ? item.children.map((c) => c.href) : [item.href]))
    .filter((href) => hrefMatchesPathname(pathname, href))
    .reduce<string | null>((best, href) => (best && best.length >= href.length ? best : href), null);
}

// Derives breadcrumb trail from the nav hierarchy: a single top-level link
// (Dashboard, AI Assistant, Settings) is just its own title; a group child
// (Contacts, Deals, Projects, ...) is a 2-level "Group > Child" trail. The
// child item carries its href so AutoBreadcrumb can link it once a detail
// page appends a third level (Breadcrumb only ever links non-last items).
export function getBreadcrumbItems(pathname: string): { label: string; href?: string }[] {
  const activeHref = getActiveHref(pathname);
  if (!activeHref) return [];

  for (const item of navLinks) {
    if (item.type === "link" && item.href === activeHref) {
      return [{ label: item.label }];
    }
    if (item.type === "group") {
      const child = item.children.find((c) => c.href === activeHref);
      if (child) return [{ label: item.label }, { label: child.label, href: child.href }];
    }
  }
  return [];
}
