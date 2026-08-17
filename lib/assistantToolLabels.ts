export const READ_TOOLS = [
  "list_contacts",
  "list_deals",
  "upcoming_tasks",
  "overdue_invoices",
  "project_progress",
] as const;

export const WRITE_TOOLS = [
  "create_contact",
  "create_task",
  "create_deal",
  "create_company",
  "create_project",
  "create_invoice",
] as const;

export type ReadTool = (typeof READ_TOOLS)[number];
export type WriteTool = (typeof WRITE_TOOLS)[number];

export const TOOL_LABELS: Record<ReadTool | WriteTool, string> = {
  list_contacts: "🔍 Looked up contacts",
  list_deals: "🔍 Looked up deals",
  upcoming_tasks: "🔍 Looked up tasks",
  overdue_invoices: "🔍 Looked up invoices",
  project_progress: "🔍 Looked up project",
  create_contact: "✅ Created contact",
  create_task: "✅ Created task",
  create_deal: "✅ Created deal",
  create_company: "✅ Created company",
  create_project: "✅ Created project",
  create_invoice: "✅ Created invoice",
};

// Suffix for the per-message "-2 AI Credits (Contact Created)" credit tag --
// separate from TOOL_LABELS above since that one carries an emoji/"Looked
// up"/"Created" prefix meant for the badge above the bubble, not inline text.
export const CREATE_ACTION_LABELS: Record<WriteTool, string> = {
  create_contact: "Contact Created",
  create_task: "Task Created",
  create_deal: "Deal Created",
  create_company: "Company Created",
  create_project: "Project Created",
  create_invoice: "Invoice Created",
};
