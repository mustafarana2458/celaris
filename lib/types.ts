export type UserProfile = {
  id: string;
  full_name: string;
  business_name: string;
  phone: string | null;
  avatar_url: string | null;
  plan: string;
  created_at: string;
};

export type Workspace = {
  id: string;
  name: string;
  owner_id: string;
  plan: string;
};

export type WorkspaceMember = {
  workspace_id: string;
  user_id: string;
  role: string;
};

export type ContactType = "lead" | "customer";

export type Contact = {
  id: string;
  workspace_id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  company_id: string | null;
  type: ContactType;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  companies?: { id: string; name: string } | null;
  contact_tags?: { tags: { id: string; name: string } | null }[] | null;
};

export type Tag = {
  id: string;
  workspace_id: string;
  name: string;
  created_at: string;
};

export type ContactFilters = {
  tagIds: string[];
  companyId: string;
  dateFrom: string;
  dateTo: string;
  missingPhone: boolean;
  missingCompany: boolean;
};

export type ContactActionResult = { error?: string };

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = 25;

export type ContactsQuery = {
  search: string;
  type: "all" | ContactType;
  page: number;
  pageSize: number;
} & ContactFilters;

export type ContactsQueryResult =
  | { contacts: Contact[]; total: number }
  | { error: string };

export type FollowUpOutputType = "email" | "message";
export type FollowUpTone = "friendly" | "professional" | "direct" | "warm";

export type FollowUpDraftResult =
  | { subject?: string; body: string }
  | { error: string };

export type CompanyIndustry = "Tech" | "Finance" | "Retail" | "Healthcare" | "Other";
export type CompanySize = "1-10" | "11-50" | "51-200" | "200+";

export type Company = {
  id: string;
  workspace_id: string;
  name: string;
  website: string | null;
  industry: CompanyIndustry | null;
  size: CompanySize | null;
  location: string | null;
  notes: string | null;
  logo_url: string | null;
  created_at: string;
};

export type DealStage = "new" | "qualified" | "proposal" | "won" | "lost";

export type Pipeline = {
  id: string;
  workspace_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
};

export type SalesTarget = {
  id: string;
  workspace_id: string;
  period_label: string;
  period_start: string;
  period_end: string;
  revenue_goal: number;
  assigned_to: string | null;
  pipeline_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  assignee?: { id: string; full_name: string } | null;
  pipelines?: { id: string; name: string } | null;
};

export type SalesTargetActionResult = { error?: string; target?: SalesTarget };

export type DealAiSummary = {
  summary: string;
  next_steps: string;
  follow_up_email: { subject: string; body: string };
};

export type DealSummaryActionResult = { error?: string; summary?: DealAiSummary; generated_at?: string };

export type PipelineView = "kanban" | "list";
export type UserPreferenceActionResult = { error?: string };

export type Deal = {
  id: string;
  workspace_id: string;
  title: string;
  contact_id: string | null;
  company_id: string | null;
  pipeline_id: string | null;
  owner_id: string | null;
  value: number | null;
  win_probability: number | null;
  stage: DealStage;
  expected_close: string | null;
  ai_score: number | null;
  ai_summary: DealAiSummary | null;
  ai_summary_generated_at: string | null;
  created_at: string;
  contacts?: {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
    companies?: { name: string } | null;
  } | null;
  companies?: { id: string; name: string } | null;
  pipelines?: { id: string; name: string } | null;
  owner?: { id: string; full_name: string } | null;
};

export type ProjectStatus = "active" | "on_hold" | "completed";

export type Milestone = {
  id: string;
  project_id: string;
  workspace_id: string;
  title: string;
  due_date: string | null;
  is_done: boolean;
  position: number;
  owner_id: string | null;
  deliverables: string | null;
  created_at: string;
  owner?: { id: string; full_name: string } | null;
  projects?: { id: string; name: string } | null;
};

export type ProjectHealth = "on_track" | "at_risk" | "delayed";

export type ProjectTemplateTaskDraft = { title: string; priority: TaskPriority };
export type ProjectTemplateMilestoneDraft = {
  title: string;
  dueInDays: number;
  tasks: ProjectTemplateTaskDraft[];
};
export type ProjectTemplateStructure = { milestones: ProjectTemplateMilestoneDraft[] };

export type ProjectTemplateRecord = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  estimated_duration_days: number | null;
  structure: ProjectTemplateStructure;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectTemplateActionResult = { error?: string; template?: ProjectTemplateRecord };

export type Project = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  client_id: string | null;
  deal_id: string | null;
  lead_id: string | null;
  start_date: string | null;
  due_date: string | null;
  budget: number | null;
  health: ProjectHealth | null;
  created_at: string;
  companies?: { id: string; name: string; logo_url: string | null } | null;
  deals?: { id: string; title: string } | null;
  lead?: { id: string; full_name: string } | null;
  milestones?: Milestone[] | null;
  tasks?:
    | {
        id: string;
        title: string;
        status: TaskStatus;
        priority: TaskPriority;
        due_date: string | null;
      }[]
    | null;
};

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskView = "kanban" | "list";

export type Subtask = {
  id: string;
  task_id: string;
  workspace_id: string;
  title: string;
  is_done: boolean;
  position: number;
  created_at: string;
};

export type Task = {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  start_date: string | null;
  due_date: string | null;
  project_id: string | null;
  assigned_to: string | null;
  created_at: string;
  projects?: { id: string; name: string } | null;
  subtasks?: Subtask[] | null;
  assignee?: { id: string; full_name: string } | null;
};

export type InvoiceStatus = "unpaid" | "paid" | "overdue";
export type RecurringFrequency = "monthly" | "quarterly" | "yearly";

export type InvoiceLineItem = {
  id: string;
  invoice_id: string;
  workspace_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  position: number;
  created_at: string;
};

export type Invoice = {
  id: string;
  workspace_id: string;
  invoice_number: string;
  contact_id: string | null;
  project_id: string | null;
  amount: number;
  tax: number;
  tax_percent: number;
  discount: number;
  total: number;
  status: InvoiceStatus;
  due_date: string | null;
  issued_at: string;
  public_token: string;
  is_recurring: boolean;
  recurring_frequency: RecurringFrequency | null;
  next_issue_date: string | null;
  contacts?: {
    id: string;
    name: string;
    company?: string | null;
    email?: string | null;
  } | null;
  projects?: { id: string; name: string } | null;
  invoice_items?: InvoiceLineItem[] | null;
};

export type InvoiceSenderDetails = {
  name: string;
  address: string | null;
  tax_number: string | null;
  support_email: string | null;
  phone: string | null;
  payment_instructions: string | null;
};

export type TeamRole = "owner" | "admin" | "member";

export type TeamMember = {
  id: string;
  workspace_id: string;
  member_name: string;
  member_email: string | null;
  role: TeamRole;
  created_at: string;
};

export type WorkspaceMemberRow = {
  user_id: string;
  role: string;
  users: { id: string; full_name: string } | null;
};

export type WorkspaceRole = "owner" | "admin" | "member";

export type WorkspaceTeamMember = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: WorkspaceRole;
  joined_at: string | null;
};

export type InvitationStatus = "pending" | "accepted" | "cancelled";
export type InvitationRole = "admin" | "member";

export type Invitation = {
  id: string;
  workspace_id: string;
  email: string;
  role: InvitationRole;
  token: string;
  status: InvitationStatus;
  invited_by: string | null;
  expires_at: string;
  created_at: string;
};
