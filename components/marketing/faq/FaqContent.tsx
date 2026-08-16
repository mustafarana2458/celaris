"use client";

import { useState } from "react";

type FaqItem = { question: string; answer: string };
type FaqGroup = { title: string; items: FaqItem[] };

const FAQ_GROUPS: FaqGroup[] = [
  {
    title: "General",
    items: [
      {
        question: "What is Celaris?",
        answer:
          "Celaris is a business operations platform that brings your CRM, deal pipeline, project management, task tracking, invoicing, and team management into one workspace — with an AI Assistant that can answer questions about your data and take actions on your behalf.",
      },
      {
        question: "Can I use Celaris on mobile?",
        answer:
          "Celaris runs in your browser and its layout is responsive, so it's usable on a phone or tablet for checking in, replying to a message from the AI Assistant, or reviewing a task. For heavier day-to-day work — building out a pipeline, editing a project template — a larger screen is the more comfortable experience.",
      },
      {
        question: "How many workspaces can I be part of?",
        answer:
          "You can belong to more than one workspace (for example if you're invited to a client's or partner's workspace) and switch between them from the workspace switcher in the sidebar. Each workspace's data is completely isolated from the others.",
      },
    ],
  },
  {
    title: "Team & Access",
    items: [
      {
        question: "Can I invite my team?",
        answer:
          "Yes — from Team → Active Members, invite teammates by email and assign them a role (Owner, Admin, or Member). They show up under Pending Invites until they accept, then appear as Active Members with a starting set of permissions you can fine-tune further.",
      },
      {
        question: "How do permissions work?",
        answer:
          "Access is controlled at three layers: role (Owner/Admin/Member) sets a starting baseline, per-teammate permissions let you switch individual modules and submodules to Off, View, or Full access, and workspace-level Module Preferences (owner-only) can turn a whole module off for everyone regardless of individual settings. See the Help Center's Team & Permissions section for the full breakdown.",
      },
      {
        question: "What's the difference between a workspace member and a Team Directory profile?",
        answer:
          "A workspace member has an actual Celaris login and a role. A Team Directory profile is a lightweight record for someone you work with but who doesn't have an account — like an external contractor — so you can still assign them tasks. Directory profiles are marked \"External\" wherever they appear.",
      },
    ],
  },
  {
    title: "Billing & Security",
    items: [
      {
        question: "How does billing work?",
        answer:
          "Your subscription and plan are managed from Settings → Billing (owner-only). Invoicing your own clients is a separate feature of the product itself — the Invoices module — not to be confused with your own Celaris subscription.",
      },
      {
        question: "Is my data secure?",
        answer:
          "Every workspace's data is isolated from every other workspace using row-level security enforced at the database layer, so one workspace can never read another's records. Sign-in runs through Supabase Auth (passwords are never stored in plain text), new signups are protected by hCaptcha, and all traffic is encrypted over HTTPS/TLS. See our Security and Privacy Policy pages for the full details.",
      },
      {
        question: "Who can see my invoices and financial data?",
        answer:
          "Only teammates whose role or permissions grant them access to Invoices and revenue-related KPIs — this applies both in the app itself and in what the AI Assistant is allowed to surface in chat. A teammate without Invoices access won't see revenue figures on the Dashboard or get them from the Assistant either.",
      },
    ],
  },
  {
    title: "AI Assistant",
    items: [
      {
        question: "What AI model powers the assistant?",
        answer:
          "The AI Assistant runs on a large language model with an automatic fallback provider, so brief outages on one provider don't take the feature down. The specific model is an internal implementation detail that can change over time as better options become available — the Assistant's capabilities are what matter, not the underlying model name.",
      },
      {
        question: "Can the AI Assistant make changes to my data?",
        answer:
          "Yes, but only with your confirmation. Ask it to create a task, contact, or deal and it will show you a preview of exactly what it's about to create — nothing is written to your workspace until you confirm. It also only ever sees the data your own permissions allow, so it can't reveal or act on anything you couldn't already access yourself.",
      },
      {
        question: "Is my chat history with the Assistant saved?",
        answer:
          "By default, yes — so you can pick up a conversation later. You can turn this off with the Save Chat History toggle on the Assistant page, or clear your history at any time with the trash icon.",
      },
    ],
  },
];

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 dark:text-neutral-500 ${
        open ? "rotate-180" : ""
      }`}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

function FaqAccordionItem({ item, defaultOpen = false }: { item: FaqItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 last:border-b-0 dark:border-neutral-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-base font-medium text-slate-900 dark:text-white">{item.question}</span>
        <ChevronIcon open={open} />
      </button>
      {open ? (
        <p className="pb-5 text-[15px] leading-relaxed text-slate-600 dark:text-neutral-300">{item.answer}</p>
      ) : null}
    </div>
  );
}

export function FaqContent() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">FAQ</span>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          Frequently asked questions
        </h1>
        <p className="mt-4 text-lg text-slate-500 dark:text-neutral-400">
          Answers to common questions about Celaris. Can&apos;t find what you need? Visit our{" "}
          <a href="/resources" className="text-blue-600 hover:underline dark:text-blue-400">
            Help Center
          </a>
          .
        </p>
      </div>

      <div className="mt-14 flex flex-col gap-10">
        {FAQ_GROUPS.map((group) => (
          <div key={group.title}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">
              {group.title}
            </h2>
            <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 px-6 dark:border-neutral-800 dark:bg-neutral-900/50">
              {group.items.map((item) => (
                <FaqAccordionItem key={item.question} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
