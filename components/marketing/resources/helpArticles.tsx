import { ReactNode } from "react";

export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "steps"; items: string[] };

export type Article = {
  slug: string;
  title: string;
  summary: string;
  blocks: ArticleBlock[];
};

export type Category = {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  articles: Article[];
};

function iconProps() {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    className: "h-5 w-5",
  } as const;
}

export const CATEGORIES: Category[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Set up your workspace and get your team moving.",
    icon: (
      <svg {...iconProps()}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22.35 22.35 0 0 1 3.53-8.65 22.7 22.7 0 0 1 8.31-6.02c.05 2.5-.63 6.36-6.02 8.31A22.35 22.35 0 0 1 12 15z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12H4.5a3 3 0 0 0-3 3v0M12 15v4.5a3 3 0 0 1-3 3v0" />
      </svg>
    ),
    articles: [
      {
        slug: "creating-your-workspace",
        title: "Creating your workspace",
        summary: "What happens when you sign up, and what a workspace actually is.",
        blocks: [
          {
            type: "p",
            text: "Celaris is multi-tenant: every account belongs to a workspace, and a workspace is the container for all of your business data — contacts, deals, projects, invoices, and team members. When you sign up, Celaris automatically creates a workspace for you and makes you its owner.",
          },
          {
            type: "p",
            text: "During signup you can name your business — if you leave it blank, Celaris falls back to a default name like \"[Your First Name]'s Workspace\" so you're never blocked from getting started. You can rename it, add your logo, and fill in details like address, tax number, and support email at any time from Settings → Workspace & Branding.",
          },
          {
            type: "p",
            text: "If you're ever invited to a second workspace, use the workspace switcher in the top-left of the sidebar to move between them — each workspace's data is fully isolated from the others.",
          },
        ],
      },
      {
        slug: "inviting-team-members",
        title: "Inviting team members",
        summary: "How to bring your team into a workspace and what roles control.",
        blocks: [
          {
            type: "p",
            text: "Go to Team → Active Members (or Pending Invites) and invite a teammate by email. Every invite is assigned a role — Owner, Admin, or Member — which sets a starting baseline of permissions across every module.",
          },
          {
            type: "p",
            text: "An invite sits under Pending Invites until the person accepts it. Once accepted, they show up under Active Members with their role and can be given more granular access from there.",
          },
          {
            type: "ul",
            items: [
              "Owner — full access everywhere, including Billing, Integrations, and Module Preferences.",
              "Admin — broad access by default, can be fine-tuned per module.",
              "Member — a narrower default baseline, also fully customizable per module and submodule.",
            ],
          },
          {
            type: "p",
            text: "For a deeper look at what roles actually control, see \"Roles and inviting teammates\" and \"Granular module & submodule permissions\" under Team & Permissions.",
          },
        ],
      },
      {
        slug: "navigating-the-dashboard",
        title: "Navigating the dashboard",
        summary: "How the sidebar, workspace switcher, and dashboard KPIs fit together.",
        blocks: [
          {
            type: "p",
            text: "The left sidebar is grouped by module: Dashboard, Contacts, Deals, Projects, Tasks, Invoices, Team, AI Assistant, and Settings. Modules with multiple views (like Contacts → People/Companies/Segments) expand into a sub-list; a breadcrumb trail at the top of the page always shows where you are.",
          },
          {
            type: "p",
            text: "The Dashboard itself surfaces at-a-glance KPI widgets — contacts, deals, and revenue summaries — plus recent activity. What you see here can vary by teammate: if your role doesn't have access to a KPI's underlying module (for example Deals), that widget is hidden rather than shown with blank data.",
          },
          {
            type: "p",
            text: "Only what your role can access appears in the sidebar at all — if a module or a specific sub-view (like Recurring Billing) is switched off for your role, its nav item simply won't be there.",
          },
        ],
      },
      {
        slug: "first-contact-deal-project",
        title: "Creating your first contact, deal, and project",
        summary: "How the core records connect to each other.",
        blocks: [
          {
            type: "p",
            text: "Most workspaces start the same way: add a contact, attach a company, then create the deal or project it belongs to.",
          },
          {
            type: "steps",
            items: [
              "Contacts → People → Add Contact. Give it a name and mark it as a Lead or a Customer.",
              "Contacts → Companies → Add Company if the contact works for a business you want to track separately.",
              "Deals → Pipelines → Add Deal. Link the contact and/or company, pick a pipeline and stage, and assign a Deal Owner.",
              "Projects → All Projects → New Project. Optionally link it to a Client company or an existing Deal, and start from a blank project or a template.",
            ],
          },
          {
            type: "p",
            text: "Because contacts, deals, and projects are all linked by relationship (not duplicated), updating a company's name or a contact's email updates it everywhere it's referenced.",
          },
        ],
      },
    ],
  },
  {
    id: "contacts-crm",
    title: "Contacts & CRM",
    description: "Keep every customer and lead organized.",
    icon: (
      <svg {...iconProps()}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
        />
      </svg>
    ),
    articles: [
      {
        slug: "adding-contacts-companies",
        title: "Adding contacts and companies",
        summary: "People and Companies are separate but linked lists.",
        blocks: [
          {
            type: "p",
            text: "Contacts → People stores individual people; Contacts → Companies stores the businesses they belong to. A contact can be linked to a company, and a company shows every contact linked to it.",
          },
          {
            type: "p",
            text: "When adding a contact, type into the Company field to search existing companies or create a new one inline without leaving the form. Every contact and company gets a colored initials avatar automatically — no logo upload needed to keep the list readable.",
          },
          {
            type: "p",
            text: "You can export your contact list to CSV at any time from the People list — useful for backups or for bringing data into another tool.",
          },
        ],
      },
      {
        slug: "leads-and-customers",
        title: "Managing leads and customers",
        summary: "The two-state contact type and how activity is tracked.",
        blocks: [
          {
            type: "p",
            text: "Every contact is typed as either a Lead or a Customer. Use this to distinguish people you're still prospecting from people who already do business with you — it's also one of the fields you can filter and segment on.",
          },
          {
            type: "p",
            text: "Each contact's detail view shows related activity — the deals, invoices, and projects tied to them — so you get full context on a person without hunting across modules.",
          },
          {
            type: "p",
            text: "The AI Assistant can also draft a follow-up message for a contact from their detail page — it uses the contact's name and context to generate a starting draft you can edit before sending.",
          },
        ],
      },
      {
        slug: "organizing-with-segments",
        title: "Organizing contacts into segments",
        summary: "Saved filters that group contacts dynamically.",
        blocks: [
          {
            type: "p",
            text: "Segments (Contacts → Segments) are saved filter rules that group your contact list dynamically — a contact doesn't need to be manually added to a segment, it matches automatically based on the rules you set.",
          },
          {
            type: "p",
            text: "Segments can filter by contact type (Lead/Customer), company, or tag, and rules can be combined and negated (e.g. \"type is Customer AND tag is not Churned\"). Every segment shows a live count of how many contacts currently match.",
          },
          {
            type: "p",
            text: "Segments are a good fit for anything you'd otherwise re-filter by hand repeatedly — for example, a saved view of \"Leads tagged VIP\" you can jump back into any time.",
          },
        ],
      },
    ],
  },
  {
    id: "deals",
    title: "Deals",
    description: "Run your pipeline from first contact to close.",
    icon: (
      <svg {...iconProps()}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"
        />
      </svg>
    ),
    articles: [
      {
        slug: "pipelines-and-stages",
        title: "Pipelines and deal stages",
        summary: "How multiple pipelines and stages work.",
        blocks: [
          {
            type: "p",
            text: "A workspace can have more than one pipeline — for example separate pipelines for different product lines or sales teams. Use the pipeline switcher at the top of Deals → Pipelines to jump between them, or create a new one inline.",
          },
          {
            type: "p",
            text: "Every deal belongs to exactly one pipeline and moves through a shared set of stages. Each deal also carries a Deal Owner, an optional linked Contact and Company, an expected close date, and a win probability percentage used in forecasting.",
          },
        ],
      },
      {
        slug: "kanban-board",
        title: "Using the Kanban board",
        summary: "Dragging deals between stages and reading the deal card.",
        blocks: [
          {
            type: "p",
            text: "Deals → Pipelines shows your active pipeline as a Kanban board — one column per stage. Drag a deal card to a new column to move it through the pipeline; the change saves immediately.",
          },
          {
            type: "p",
            text: "Each card shows the deal owner's avatar and a sparkle icon for AI Summary. You can switch between the Kanban view and a flat List view — Celaris remembers which one you last used and restores it on your next visit.",
          },
          {
            type: "p",
            text: "Edit and delete actions live behind the \"...\" menu on each card so the board stays visually clean.",
          },
        ],
      },
      {
        slug: "forecasts-and-targets",
        title: "Forecasts and sales targets",
        summary: "The executive view of pipeline health, separate from the board.",
        blocks: [
          {
            type: "p",
            text: "Deals → Forecasts is a dedicated dashboard for pipeline health, distinct from the Kanban board. It shows Won revenue, a Weighted forecast (each open deal's value multiplied by its win probability), and progress against any Sales Target you've set for a period.",
          },
          {
            type: "p",
            text: "Owners and admins can set a Sales Target for a period (e.g. \"Q3 2026\") with a revenue goal, optionally scoped to a specific rep or left open to the whole team. Regular members can view forecasts and targets but can't create or edit them.",
          },
          {
            type: "p",
            text: "Forecast calculations are based on each deal's expected close date, so a deal without one won't appear in a given period's numbers — worth checking if a period's forecast looks lower than expected.",
          },
        ],
      },
      {
        slug: "ai-deal-summary",
        title: "AI deal summaries",
        summary: "One-click AI recap and a ready-to-send follow-up email.",
        blocks: [
          {
            type: "p",
            text: "Click the sparkle icon on any deal (from the Kanban card or the List view) to generate an AI summary: a short recap of the deal's status, suggested next steps, and a drafted follow-up email you can open directly in your email client.",
          },
          {
            type: "p",
            text: "The summary is generated once and cached on the deal — reopening it shows the same summary instantly instead of regenerating, so you won't get a different answer each time you check.",
          },
        ],
      },
    ],
  },
  {
    id: "projects-tasks",
    title: "Projects & Tasks",
    description: "Plan, template, and track work from kickoff to done.",
    icon: (
      <svg {...iconProps()}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.379a1.5 1.5 0 0 1 1.06.44l1.122 1.12a1.5 1.5 0 0 0 1.06.44H19.5A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-10z"
        />
      </svg>
    ),
    articles: [
      {
        slug: "projects-and-templates",
        title: "Creating projects from templates",
        summary: "Starting from scratch vs. reusing a template.",
        blocks: [
          {
            type: "p",
            text: "Projects → All Projects lists every project as cards or a table (toggle in the top corner), each with status, an optional Client company, budget, and a health badge (On Track / At Risk / Delayed) once you set one.",
          },
          {
            type: "p",
            text: "Projects → Project Templates lets you start new projects from a reusable structure of milestones and tasks instead of building each one by hand. Celaris ships with a few built-in templates (marked \"Built-in\", read-only), and you can build your own custom templates with nested milestones and tasks that you drag to reorder.",
          },
          {
            type: "p",
            text: "Picking a template when creating a project seeds its milestones and tasks automatically — you can still edit or remove anything afterward.",
          },
        ],
      },
      {
        slug: "milestones-and-timeline",
        title: "Milestones and the timeline view",
        summary: "Tracking due dates across every active project at once.",
        blocks: [
          {
            type: "p",
            text: "Each project has its own milestone checklist on its detail page. Projects → Milestones & Timeline zooms out to a cross-project roadmap — one row per active project, with each milestone shown as a colored chip positioned on its due date along a shared timeline, plus a marker for today.",
          },
          {
            type: "p",
            text: "Milestones from completed projects are left off the timeline (it's meant to show what's still coming up, not history). You can add a milestone directly from the master timeline or from inside a project — both stay in sync.",
          },
        ],
      },
      {
        slug: "my-tasks-team-board-workload",
        title: "My Tasks, Team Board, and Workload",
        summary: "Three views over the same task data.",
        blocks: [
          {
            type: "p",
            text: "Tasks → My Tasks shows only what's assigned to you. Tasks → Team Board is a shared Kanban across the whole team's tasks. Tasks → Workload is a calendar-style view of who has how much assigned on which day, so you can spot overload before it happens.",
          },
          {
            type: "p",
            text: "Tasks can be assigned to an active workspace member, or to a \"directory\" profile from Team Directory — useful for external collaborators who don't have a Celaris login. Directory assignees are marked \"External\" wherever they appear.",
          },
          {
            type: "p",
            text: "Each task can carry a priority (Low/Medium/High/Urgent), a due date, and a checklist of subtasks for breaking bigger work down.",
          },
        ],
      },
    ],
  },
  {
    id: "invoices",
    title: "Invoices",
    description: "Bill clients, run retainers, and get paid.",
    icon: (
      <svg {...iconProps()}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v12m-3-2.818.879.879a3 3 0 0 0 4.242 0 3 3 0 0 0 0-4.242L9.879 7.879a3 3 0 0 1 0-4.242 3 3 0 0 1 4.242 0l.879.879"
        />
      </svg>
    ),
    articles: [
      {
        slug: "creating-invoices",
        title: "Creating and sending invoices",
        summary: "Line items, taxes, discounts, and payment status.",
        blocks: [
          {
            type: "p",
            text: "Invoices → All Invoices is your full ledger with status badges (Paid/Overdue/etc.) and quick actions — Mark Paid, Print, PDF, Edit, Delete — behind each row's \"...\" menu.",
          },
          {
            type: "p",
            text: "When creating an invoice, Celaris suggests the next invoice number automatically based on your most recent one, though you can always override it. Add line items manually or pull them straight from your Product Library, then apply a flat discount and tax percentage — the subtotal, discount, tax, and total are broken down clearly on the invoice.",
          },
          {
            type: "p",
            text: "An invoice can optionally be linked to a Project, so you can trace billing back to the work it covers.",
          },
        ],
      },
      {
        slug: "printing-and-pdf",
        title: "PDF, print, and payment details",
        summary: "What appears on the document your client receives.",
        blocks: [
          {
            type: "p",
            text: "Every invoice can be printed or exported as a PDF directly from its row menu. The document includes your business details — name, address, tax ID, email, and phone — pulled from Settings → Workspace & Branding, plus any payment instructions you've set there.",
          },
          {
            type: "p",
            text: "If your printed invoices are missing address, tax ID, or payment details, check that they're filled in under Settings → Workspace & Branding — the invoice template only shows what's actually on file.",
          },
        ],
      },
      {
        slug: "recurring-billing",
        title: "Recurring billing (retainers)",
        summary: "Setting up a repeating billing profile for a client.",
        blocks: [
          {
            type: "p",
            text: "Invoices → Recurring Billing manages retainer-style billing profiles, separate from the recurring flag on a single invoice. A profile has its own line items, a frequency (weekly, monthly, quarterly, or annually), a next-issue date, and a status of Active or Paused.",
          },
          {
            type: "p",
            text: "A profile also has an Auto-send toggle for when generated invoices should be emailed automatically once that part of the billing engine is fully wired up — for now, a profile defines the recurring terms so they're ready to issue against.",
          },
        ],
      },
      {
        slug: "product-library",
        title: "Product library",
        summary: "Reusable line items for faster invoicing.",
        blocks: [
          {
            type: "p",
            text: "Invoices → Product Library is a catalog of products or services you bill repeatedly — each with a name, description, unit price, and whether it's taxable.",
          },
          {
            type: "p",
            text: "While building line items on an invoice or a recurring profile, use \"+ Add from product library\" to pull in a saved item instead of typing the description and price every time.",
          },
        ],
      },
    ],
  },
  {
    id: "team-permissions",
    title: "Team & Permissions",
    description: "Control who can see and do what in your workspace.",
    icon: (
      <svg {...iconProps()}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75 11.25 15 15 9.75M21 12c0 4.556-3.04 8.396-7.2 9.62a1.5 1.5 0 0 1-.6.078A1.5 1.5 0 0 1 12.6 21.62C8.44 20.396 5.4 16.556 5.4 12V6.632c0-.416.223-.795.583-.995A11.98 11.98 0 0 1 12 4.5a11.98 11.98 0 0 1 6.017 1.137c.36.2.583.579.583.995V12z"
        />
      </svg>
    ),
    articles: [
      {
        slug: "roles-and-inviting",
        title: "Roles and inviting teammates",
        summary: "Owner, Admin, and Member — what each starts with.",
        blocks: [
          {
            type: "p",
            text: "Every teammate holds one role: Owner, Admin, or Member. Owner is reserved for the workspace creator and always has full access, including owner-only settings like Billing, Integrations, and Module Preferences.",
          },
          {
            type: "p",
            text: "Admin and Member each get a default permission baseline the moment they accept their invite — Admin's is broader, Member's is narrower — but both are fully customizable afterward from Team → Active Members.",
          },
        ],
      },
      {
        slug: "granular-permissions",
        title: "Granular module & submodule permissions",
        summary: "Fine-tuning access per module and per view.",
        blocks: [
          {
            type: "p",
            text: "Beyond role, every teammate's access can be tuned per module (e.g. Deals, Invoices) and even per submodule within it (e.g. only Recurring Billing, not the whole Invoices module). Each area can be switched off entirely, or set to View or Full access.",
          },
          {
            type: "p",
            text: "View access lets someone see records but not create, edit, or delete them — the Add/Edit/Delete controls simply don't appear for them. When a module or submodule is switched off, its sidebar entry disappears for that teammate too, not just the page content.",
          },
          {
            type: "p",
            text: "Open a teammate's permissions from Team → Active Members to adjust this per person, at any time.",
          },
        ],
      },
      {
        slug: "departments",
        title: "Departments",
        summary: "Grouping teammates for organization and reporting.",
        blocks: [
          {
            type: "p",
            text: "Team → Departments lets you group teammates — for example Sales, Support, or Delivery — to keep a growing team organized. Departments are for structure and clarity across the workspace, distinct from the granular per-module permissions described above.",
          },
        ],
      },
      {
        slug: "team-directory-and-external",
        title: "Team Directory and external assignees",
        summary: "Assigning work to people who don't have a Celaris login.",
        blocks: [
          {
            type: "p",
            text: "Team → Team Directory holds lightweight profiles for people you work with but who don't have (or need) a Celaris account — freelancers, contractors, or external stakeholders.",
          },
          {
            type: "p",
            text: "Directory profiles can be assigned tasks just like real teammates, and show up marked \"External\" wherever they're referenced so it's always clear who's an actual logged-in member of your workspace.",
          },
        ],
      },
      {
        slug: "module-preferences-workspace",
        title: "Module preferences (workspace-level)",
        summary: "How workspace-level toggles interact with per-member permissions.",
        blocks: [
          {
            type: "p",
            text: "Settings → Module Preferences (owner-only) is a workspace-wide switch, layered on top of the per-member permissions described above. If a module is disabled here for the whole workspace, it's off for everyone regardless of any individual teammate's permissions.",
          },
          {
            type: "p",
            text: "Use workspace-level Module Preferences to turn off features your business doesn't use at all (for example, if you don't run Recurring Billing); use per-member permissions to control who on your team can access what you do use.",
          },
        ],
      },
    ],
  },
  {
    id: "ai-assistant",
    title: "AI Assistant",
    description: "A conversational assistant that knows your workspace.",
    icon: (
      <svg {...iconProps()}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 0 0 2.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
        />
      </svg>
    ),
    articles: [
      {
        slug: "how-it-works",
        title: "How the AI Assistant works",
        summary: "A chat interface that can read and act on your workspace data.",
        blocks: [
          {
            type: "p",
            text: "AI Assistant is a chat interface, scoped to your workspace, that can answer questions about your data and take actions on your behalf. Ask it things like \"who are my overdue invoices from\" or \"what's the status of the Big Bang project\" and it queries your actual contacts, deals, tasks, invoices, and project data to answer — it only ever answers using data your permissions allow it to see.",
          },
          {
            type: "p",
            text: "Answers that involve dollar figures (deal values, revenue) or contact details respect the same module permissions as the rest of the app — if a teammate's role can't see revenue on the Dashboard, the Assistant won't reveal it in chat either.",
          },
        ],
      },
      {
        slug: "function-calling",
        title: "Creating tasks and contacts from chat",
        summary: "How the Assistant proposes an action before taking it.",
        blocks: [
          {
            type: "p",
            text: "Beyond answering questions, the Assistant can take action: ask it to \"create a task to call Ahmed tomorrow\" or \"add a new lead named Sara Khan, sara@acme.com\" and it will parse out the details (including relative dates like \"tomorrow\") and show you a preview of exactly what it's about to create.",
          },
          {
            type: "p",
            text: "Nothing is created until you confirm the preview — the Assistant never silently writes to your workspace. Once confirmed, the new task, contact, or deal is created for real and appears in that module immediately.",
          },
        ],
      },
      {
        slug: "chat-history",
        title: "Chat history and memory",
        summary: "The Save Chat History toggle and how far back the Assistant remembers.",
        blocks: [
          {
            type: "p",
            text: "By default, your conversations with the Assistant are saved so you can pick up where you left off. Turn the Save Chat History toggle off (top of the Assistant page) to stop new messages from being stored — your session still works, it just won't be there on your next visit.",
          },
          {
            type: "p",
            text: "Use the trash icon to clear your chat history — you'll be asked to confirm first. When history is being saved, the Assistant also uses your recent conversation as context for follow-up questions, so you can say \"and what about last month\" without repeating the full question.",
          },
        ],
      },
      {
        slug: "ai-model",
        title: "What powers the Assistant",
        summary: "The model behind the chat and the summaries.",
        blocks: [
          {
            type: "p",
            text: "The AI Assistant and features like AI Deal Summary run on a large language model with an automatic fallback provider, so a brief outage on one provider doesn't take the feature down — Celaris handles that switch behind the scenes, there's nothing for you to configure.",
          },
          {
            type: "p",
            text: "See the FAQ for the current model name, or check back here — this article is kept in sync with what's actually running in production.",
          },
        ],
      },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    description: "Your profile, workspace branding, and preferences.",
    icon: (
      <svg {...iconProps()}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
    articles: [
      {
        slug: "profile-and-account",
        title: "Profile & Account",
        summary: "Your personal details and profile picture.",
        blocks: [
          {
            type: "p",
            text: "Settings → Profile & Account is where you update your own name and profile picture. Your profile picture uploads directly to your account and shows up anywhere your name appears — assignments, deal owners, comments, and so on.",
          },
        ],
      },
      {
        slug: "workspace-branding",
        title: "Workspace branding",
        summary: "The details your invoices and workspace identity are built from.",
        blocks: [
          {
            type: "p",
            text: "Settings → Workspace & Branding (owner) holds your workspace's identity: name, logo, support email, phone, tax number, currency, address, and default payment instructions.",
          },
          {
            type: "p",
            text: "These fields aren't just cosmetic — your invoice PDFs and print template pull business details and payment instructions directly from here, so keeping them filled in matters for anything you send to clients.",
          },
        ],
      },
      {
        slug: "appearance",
        title: "Appearance: theme and accent color",
        summary: "Light/dark mode and the four accent colors.",
        blocks: [
          {
            type: "p",
            text: "Settings → Appearance lets you switch between light and dark mode and pick an accent color — Blue, Green, Purple, or Amber — used throughout buttons, active states, and charts. This is a personal preference, saved to your account, not shared with the rest of your workspace.",
          },
        ],
      },
      {
        slug: "module-preferences",
        title: "Module preferences",
        summary: "Turning entire modules on or off for the workspace.",
        blocks: [
          {
            type: "p",
            text: "Settings → Module Preferences (owner-only) controls which modules and submodules are switched on for the whole workspace — layered above, and enforced regardless of, any individual teammate's own permissions. See \"Module preferences (workspace-level)\" under Team & Permissions for how the two interact.",
          },
        ],
      },
    ],
  },
];

export function findArticle(categoryId: string, slug: string) {
  const category = CATEGORIES.find((c) => c.id === categoryId);
  const article = category?.articles.find((a) => a.slug === slug);
  return category && article ? { category, article } : null;
}

export function articleSearchText(article: Article) {
  const blockText = article.blocks
    .map((b) => (b.type === "p" ? b.text : b.items.join(" ")))
    .join(" ");
  return `${article.title} ${article.summary} ${blockText}`.toLowerCase();
}
