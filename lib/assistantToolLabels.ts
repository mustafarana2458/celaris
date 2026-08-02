export const READ_TOOLS = [
  "list_contacts",
  "list_deals",
  "upcoming_tasks",
  "overdue_invoices",
  "project_progress",
] as const;

export const WRITE_TOOLS = ["create_contact", "create_task", "create_deal"] as const;

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
};
