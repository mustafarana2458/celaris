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
  created_at: string;
};

export type DealStage = "new" | "qualified" | "proposal" | "won" | "lost";

export type Deal = {
  id: string;
  workspace_id: string;
  title: string;
  contact_id: string | null;
  value: number | null;
  stage: DealStage;
  expected_close: string | null;
  ai_score: number | null;
  created_at: string;
  contacts?: { id: string; name: string } | null;
};

export type ProjectStatus = "active" | "on_hold" | "completed";

export type Project = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
};

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type Task = {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  project_id: string | null;
  created_at: string;
  projects?: { id: string; name: string } | null;
};

export type InvoiceStatus = "unpaid" | "paid" | "overdue";

export type Invoice = {
  id: string;
  workspace_id: string;
  invoice_number: string;
  contact_id: string | null;
  amount: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  due_date: string | null;
  issued_at: string;
  public_token: string;
  contacts?: {
    id: string;
    name: string;
    company?: string | null;
    email?: string | null;
  } | null;
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
