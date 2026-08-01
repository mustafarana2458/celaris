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
      { href: "/dashboard/companies", label: "Companies" },
    ],
  },
  { type: "link", href: "/dashboard/deals", label: "Deals", icon: "trending" },
  { type: "link", href: "/dashboard/projects", label: "Projects", icon: "folder" },
  { type: "link", href: "/dashboard/tasks", label: "Tasks", icon: "check" },
  { type: "link", href: "/dashboard/invoices", label: "Invoices", icon: "invoice" },
  { type: "link", href: "/dashboard/team", label: "Team", icon: "team" },
  { type: "link", href: "/dashboard/assistant", label: "AI Assistant", icon: "assistant" },
  { type: "link", href: "/dashboard/settings", label: "Settings", icon: "settings" },
];
