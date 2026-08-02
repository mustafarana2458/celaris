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
};

export type NavGroup = {
  type: "group";
  label: string;
  icon: IconName;
  children: { href: string; label: string }[];
};

export type NavItem = NavLink | NavGroup;

export const navLinks: NavItem[] = [
  { type: "link", href: "/dashboard", label: "Dashboard", icon: "home" },
  {
    type: "group",
    label: "Contacts",
    icon: "users",
    children: [
      { href: "/dashboard/contacts", label: "People" },
      { href: "/dashboard/companies", label: "Companies/Accounts" },
      { href: "/dashboard/contacts/segments", label: "Segments/Lists" },
    ],
  },
  {
    type: "group",
    label: "Deals",
    icon: "trending",
    children: [
      { href: "/dashboard/deals", label: "Pipelines" },
      { href: "/dashboard/deals", label: "Forecasts" },
    ],
  },
  {
    type: "group",
    label: "Projects",
    icon: "folder",
    children: [
      { href: "/dashboard/projects", label: "All Projects" },
      { href: "/dashboard/projects", label: "Project Templates" },
      { href: "/dashboard/projects/milestones", label: "Milestones & Timeline" },
    ],
  },
  {
    type: "group",
    label: "Tasks",
    icon: "check",
    children: [
      { href: "/dashboard/tasks", label: "My Tasks" },
      { href: "/dashboard/tasks/team-board", label: "Team Board" },
      { href: "/dashboard/tasks/workload", label: "Workload/Calendar" },
    ],
  },
  {
    type: "group",
    label: "Invoices",
    icon: "invoice",
    children: [
      { href: "/dashboard/invoices", label: "All Invoices" },
      { href: "/dashboard/invoices", label: "Recurring Billing" },
      { href: "/dashboard/invoices/product-library", label: "Product Library" },
    ],
  },
  {
    type: "group",
    label: "Team",
    icon: "team",
    children: [
      { href: "/dashboard/team", label: "Active Members" },
      { href: "/dashboard/team", label: "Pending Invites" },
      { href: "/dashboard/team/departments", label: "Departments/Groups" },
    ],
  },
  { type: "link", href: "/dashboard/assistant", label: "AI Assistant", icon: "assistant", badge: "Beta" },
  { type: "link", href: "/dashboard/settings", label: "Settings", icon: "settings" },
];
