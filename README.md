<p align="center">
  <img src="public/celaris-logo.svg" alt="Celaris logo" width="72" />
</p>

<h1 align="center">Celaris</h1>

<p align="center">
  <b>The AI-native business suite for growing teams.</b><br />
  CRM, deals, projects, invoicing, and a built-in AI assistant — one workspace, one login.
</p>

<p align="center">
  <a href="https://celaris.cloud"><strong>Live App »</strong></a>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-14.2-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-Proprietary-lightgrey?style=flat-square" />
  <img alt="Status" src="https://img.shields.io/badge/status-Active-success?style=flat-square" />
  <img alt="PRs" src="https://img.shields.io/badge/PRs-not_accepted-red?style=flat-square" />
</p>

---

## Overview

**Celaris** is a full-stack, multi-tenant SaaS business suite built for small and mid-sized teams that have outgrown spreadsheets but don't need — or want to pay for — a bloated enterprise stack. It bundles the tools a growing business actually uses day to day (CRM, sales pipeline, project management, invoicing) with an **AI assistant that can act on the data**, not just answer questions about it.

Every account gets an isolated **workspace** (multi-tenant via Postgres Row-Level Security), invites teammates with granular per-module permissions, and pays through a metered AI-credit system that scales with usage — enforced through Supabase, LemonSqueezy/Safepay billing, and a custom platform-wide **Super Admin Portal** for operating the business itself.

Live at **[celaris.cloud](https://celaris.cloud)**, with a fully independent Admin Portal at `admin.celaris.cloud` served from the same deployment via host-based routing.

---

## ✨ Features

### CRM & Sales
- **Contacts & Companies** — unified customer/lead database with tagging, custom segments, CSV import/export, and activity history
- **Deals Pipeline** — Kanban-style pipeline tracking from first touch to closed-won, with per-stage drag-and-drop (`dnd-kit`)
- **Forecasts** — revenue forecasting by period, rolled up from live pipeline data

### Project & Task Management
- **Projects** — full project lifecycle with budgets, progress tracking, and reusable **project templates**
- **Milestones & Gantt Timeline** — visual, drag-to-schedule milestone timelines
- **Tasks** — kanban task boards, a **team board** view, and a **workload** view for capacity planning

### Billing & Invoicing
- **Invoices** — create, send, and track invoices with PDF generation (`jspdf`)
- **Recurring Invoices** — automated recurring billing schedules
- **Product Library** — reusable line-item catalog for fast invoice creation
- **Payment Gateways** — **LemonSqueezy** and **Safepay** integrations with admin-controlled toggles per gateway

### AI Assistant
- Conversational assistant embedded in the dashboard that can **read and act on live workspace data** — list/create contacts, deals, tasks, companies, projects, and invoices via structured tool calls
- Multiple model backends: **Groq**, **OpenAI**, **Mistral**, and **local Ollama**, switchable per-workspace by the platform operator
- Persistent conversation memory per user
- **Metered AI credit system** — usage-based credits with plan-tier limits, admin-grantable promo credits, and purchasable top-ups (LemonSqueezy)

### Team & Access Control
- **Workspace invites** with email delivery (Resend)
- **Departments & Directory** — org-structure and team directory views
- Fine-grained **role & permission system** — module-level and sub-module-level access control (owner bypass, per-member overrides), enforced identically in the sidebar *and* at the route/server level

### Platform / Super Admin Portal
A completely separate, independently-authenticated (`admin_users` / `admin_sessions`) operator console for running the SaaS business itself:
- Workspace & user management across every tenant
- **AI Engine Control** — switch active AI provider/model platform-wide, monitor usage
- **Promo Code Engine** — create, redeem, and auto-expire promotional AI-credit codes (cron-driven reversion)
- **Financials** — subscription & payment oversight across both payment gateways
- **Audit Logs** — full admin action history
- Served on `admin.celaris.cloud`, reverse-proxied to the same app via Host-header routing in middleware — zero separate deployment

### Product Site & Auth
- Public marketing site: landing, features, pricing, resources, FAQ
- Legal suite: Terms, Privacy, Cookie Policy, DPA
- Auth flows: signup (hCaptcha-protected), login, password reset/update, workspace invite acceptance
- System **status page**
- Full light/dark theme support across the entire app, marketing site, and legal pages

---

## 🛠 Tech Stack

<table>
<tr><td><b>Framework</b></td><td>
<img src="https://img.shields.io/badge/Next.js_14-App_Router-000000?style=flat-square&logo=nextdotjs&logoColor=white" />
<img src="https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
</td></tr>
<tr><td><b>Database & Auth</b></td><td>
<img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white" />
<img src="https://img.shields.io/badge/PostgreSQL-RLS-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
</td></tr>
<tr><td><b>Styling / UI</b></td><td>
<img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
<img src="https://img.shields.io/badge/Radix_UI-161618?style=flat-square&logo=radixui&logoColor=white" />
<img src="https://img.shields.io/badge/shadcn/ui-000000?style=flat-square" />
<img src="https://img.shields.io/badge/Lucide_Icons-F56565?style=flat-square" />
</td></tr>
<tr><td><b>Forms & Data</b></td><td>
<img src="https://img.shields.io/badge/React_Hook_Form-EC5990?style=flat-square&logo=reacthookform&logoColor=white" />
<img src="https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white" />
<img src="https://img.shields.io/badge/TanStack_Query-FF4154?style=flat-square&logo=reactquery&logoColor=white" />
</td></tr>
<tr><td><b>AI</b></td><td>
<img src="https://img.shields.io/badge/Groq-F55036?style=flat-square" />
<img src="https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white" />
<img src="https://img.shields.io/badge/Mistral_AI-FA520F?style=flat-square" />
<img src="https://img.shields.io/badge/Ollama-000000?style=flat-square" />
</td></tr>
<tr><td><b>Payments</b></td><td>
<img src="https://img.shields.io/badge/Lemon_Squeezy-FFC233?style=flat-square" />
<img src="https://img.shields.io/badge/Safepay-1A73E8?style=flat-square" />
</td></tr>
<tr><td><b>Other</b></td><td>
<img src="https://img.shields.io/badge/dnd--kit-drag_&_drop-8B5CF6?style=flat-square" />
<img src="https://img.shields.io/badge/Tiptap-rich_text-000000?style=flat-square" />
<img src="https://img.shields.io/badge/Recharts-charts-22B5BF?style=flat-square" />
<img src="https://img.shields.io/badge/jsPDF-PDF_generation-D32F2F?style=flat-square" />
<img src="https://img.shields.io/badge/Resend-email-000000?style=flat-square" />
<img src="https://img.shields.io/badge/hCaptcha-bot_protection-0074E4?style=flat-square" />
</td></tr>
</table>

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (Postgres + Auth)
- API keys for whichever integrations you want active (see below)

### Installation

```bash
git clone <repository-url>
cd SAAS
npm install
```

### Environment variables

Create a `.env.local` in the project root:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=
NODE_ENV=development

# AI providers (configure the ones you use)
GROQ_API_KEY=
OPENAI_API_KEY=
MISTRAL_API_KEY=
OLLAMA_URL=

# Payments
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_TOPUP_VARIANT_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=
SAFEPAY_WEBHOOK_SECRET=

# Email
RESEND_API_KEY=

# Security / misc
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=
NEXT_PUBLIC_INACTIVITY_TIMEOUT_MS=
CRON_SECRET=
DEV_PANEL_PIN=
```

### Database setup

Apply the SQL migrations in `sql/` to your Supabase project (in order), then generate types:

```bash
npm run update-types
```

### Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run update-types` | Regenerate Supabase TypeScript types |

---

## 📁 Folder Structure

```
SAAS/
├── app/                        # Next.js App Router
│   ├── (marketing pages)       # /, /features, /pricing, /resources, /faq, /security, /status
│   ├── admin/                  # Super Admin Portal (independent auth)
│   │   ├── login/
│   │   └── (protected)/        # ai-engine, financials, promo-codes, users, workspaces, audit-logs
│   ├── admin-login/
│   ├── api/                    # Route handlers
│   │   ├── admin/               # Admin Portal mutations (ai-engine, auth, payments, promo, users, workspaces)
│   │   ├── cron/                # Scheduled jobs (promo credit reversion, etc.)
│   │   ├── promo/                # Promo code redemption
│   │   └── webhooks/            # LemonSqueezy & Safepay payment webhooks
│   ├── dashboard/               # Authenticated app
│   │   ├── assistant/           # AI Assistant
│   │   ├── companies/
│   │   ├── contacts/            # + segments
│   │   ├── deals/               # + forecasts
│   │   ├── invoices/            # + recurring, product-library
│   │   ├── projects/            # + [id], milestones, templates
│   │   ├── settings/            # profile, workspace, billing, appearance, integrations, AI usage
│   │   ├── tasks/                # + team-board, workload
│   │   └── team/                 # departments, directory, invites
│   ├── login/, signup/, invite/, reset-password/, update-password/
│   ├── billing-gateway/, invoice/[id] (public share links)
│   └── cookie-policy/, dpa/, privacy/, terms/         # legal pages
├── components/
│   ├── admin/, assistant/, auth/, companies/, contacts/,
│   │   dashboard/, deals/, invoices/, legal/, projects/,
│   │   segments/, tasks/, team/, workspace/            # feature-scoped UI
│   ├── marketing/                                       # landing/features/pricing/faq
│   └── ui/                                               # shared primitives (shadcn-based)
├── lib/
│   ├── actions/                 # Server Actions (data mutations)
│   ├── supabase/                # Supabase client/middleware helpers
│   ├── assistantTools.ts        # AI tool-calling implementations
│   ├── permissions.ts           # Module/submodule access control
│   ├── aiCredits*.ts            # AI credit metering & sync
│   ├── paymentGateways.ts, lemonSqueezy.ts, safepay.ts
│   └── ...                      # invoicePdf, invoiceNumber, workspace, email, etc.
├── hooks/                        # Shared React hooks
├── sql/                          # Postgres migrations & RLS policies
├── scripts/                      # One-off/admin CLI scripts
├── public/                       # Static assets
└── middleware.ts                 # Auth session + admin subdomain routing
```

---

## 📸 Screenshots

> _Add product screenshots or a demo GIF here to showcase the dashboard, deals pipeline, AI assistant, and admin portal._

| Dashboard | Deals Pipeline |
|---|---|
| _screenshot here_ | _screenshot here_ |

| AI Assistant | Admin Portal |
|---|---|
| _screenshot here_ | _screenshot here_ |

---

## 📄 License

Proprietary — all rights reserved. This codebase is not licensed for reuse or redistribution.

<p align="center">Engineered by Aevia</p>
