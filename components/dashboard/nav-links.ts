export const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "home" },
  { href: "/dashboard/contacts", label: "Contacts", icon: "users" },
  { href: "/dashboard/deals", label: "Deals", icon: "trending" },
  { href: "/dashboard/projects", label: "Projects", icon: "folder" },
  { href: "/dashboard/tasks", label: "Tasks", icon: "check" },
  { href: "/dashboard/invoices", label: "Invoices", icon: "invoice" },
  { href: "/dashboard/team", label: "Team", icon: "team" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
] as const;

export type IconName = (typeof navLinks)[number]["icon"];
