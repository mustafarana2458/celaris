export type PermissionModule = {
  key: string;
  label: string;
  submodules?: { key: string; label: string }[];
};

// Mirrors the module/submodule structure in nav-links.ts. Keys are stable
// identifiers stored in workspace_members.permissions, independent of route
// paths or labels so renaming a nav link doesn't break saved permissions.
export const PERMISSION_MODULES: PermissionModule[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "contacts", label: "Contacts" },
  { key: "deals", label: "Deals" },
  { key: "projects", label: "Projects" },
  { key: "tasks", label: "Tasks" },
  {
    key: "invoices",
    label: "Invoices",
    submodules: [
      { key: "recurring_billing", label: "Recurring Billing" },
      { key: "product_library", label: "Product Library" },
    ],
  },
  { key: "team", label: "Team" },
  { key: "ai_assistant", label: "AI Assistant" },
  { key: "settings", label: "Settings" },
];
