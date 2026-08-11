"use client";

import { ReactNode, useMemo, useState } from "react";

type Category = {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  articles: string[];
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

const CATEGORIES: Category[] = [
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
      "Creating your first workspace",
      "Inviting team members",
      "Setting up your dashboard",
      "Choosing an accent color & theme",
      "Navigating the sidebar",
    ],
  },
  {
    id: "billing-settings",
    title: "Billing & Settings",
    description: "Manage your plan, workspace, and preferences.",
    icon: (
      <svg {...iconProps()}>
        <rect x="2.25" y="5.25" width="19.5" height="13.5" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 9.75h19.5" />
      </svg>
    ),
    articles: [
      "Managing your subscription",
      "Switching between Monthly and Yearly billing",
      "Updating workspace branding",
      "Managing notification preferences",
      "Understanding roles and workspace settings",
    ],
  },
  {
    id: "managing-projects",
    title: "Managing Projects",
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
      "Creating a project from a template",
      "Setting milestones and deadlines",
      "Using the Gantt timeline view",
      "Tracking project budgets",
      "Assigning tasks to teammates",
    ],
  },
  {
    id: "api-documentation",
    title: "API Documentation",
    description: "Integrate Celaris with your own tools and scripts.",
    icon: (
      <svg {...iconProps()}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 9-3 3 3 3M15.75 9l3 3-3 3M13.5 6l-3 12" />
      </svg>
    ),
    articles: [
      "Authenticating API requests",
      "Contacts & Companies endpoints",
      "Deals & Pipeline endpoints",
      "Webhooks overview",
      "Rate limits & pagination",
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
      "Importing your contact list",
      "Organizing contacts into segments",
      "Linking contacts to companies",
      "Tracking contact activity history",
      "Merging duplicate contacts",
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
      "Understanding role-based permissions",
      "Setting up departments",
      "Customizing module-level access",
      "Managing pending invitations",
      "Removing a team member",
    ],
  },
];

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={`h-4 w-4 shrink-0 ${className}`}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0-6-6m6 6-6 6" />
    </svg>
  );
}

export function ResourcesContent() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return CATEGORIES.flatMap((cat) =>
      cat.articles
        .filter((title) => title.toLowerCase().includes(q))
        .map((title) => ({ title, categoryTitle: cat.title }))
    );
  }, [query]);

  const activeCategory = selectedCategory ? CATEGORIES.find((c) => c.id === selectedCategory) : null;
  const isSearching = query.trim().length > 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 lg:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Help Center</span>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          How can we help?
        </h1>
        <p className="mt-4 text-lg text-slate-500 dark:text-neutral-400">
          Search our library or browse by category.
        </p>
      </div>

      <div className="relative mx-auto mt-10 max-w-2xl">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-neutral-500"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M18.5 11a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedCategory(null);
          }}
          placeholder="How can we help?"
          className="w-full rounded-2xl border border-transparent bg-white py-4 pl-14 pr-5 text-base text-slate-900 shadow-md outline-none transition-all placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 dark:bg-neutral-900 dark:text-white dark:shadow-none dark:placeholder:text-neutral-500 dark:focus:ring-2 dark:focus:ring-blue-500"
        />
      </div>

      <div className="mt-14">
        {isSearching ? (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">
              {searchResults.length} result{searchResults.length === 1 ? "" : "s"} for &quot;{query}&quot;
            </h2>
            {searchResults.length > 0 ? (
              <ul className="mt-4 divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 dark:divide-neutral-800 dark:border-neutral-800">
                {searchResults.map((result, i) => (
                  <li key={`${result.title}-${i}`}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-neutral-900/60"
                    >
                      <span className="flex flex-col">
                        <span className="text-sm font-medium text-slate-800 dark:text-neutral-100">{result.title}</span>
                        <span className="mt-0.5 text-xs text-gray-400 dark:text-neutral-500">{result.categoryTitle}</span>
                      </span>
                      <ArrowIcon className="text-gray-400 dark:text-neutral-500" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-gray-500 dark:text-neutral-400">
                No articles matched. Try a different search term.
              </p>
            )}
          </div>
        ) : activeCategory ? (
          <div>
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <ArrowIcon className="rotate-180" />
              Back to categories
            </button>
            <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{activeCategory.title}</h2>
            <p className="mt-2 text-slate-500 dark:text-neutral-400">{activeCategory.description}</p>
            <ul className="mt-8 divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 dark:divide-neutral-800 dark:border-neutral-800">
              {activeCategory.articles.map((title) => (
                <li key={title}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm text-slate-700 transition-colors hover:bg-gray-50 dark:text-neutral-200 dark:hover:bg-neutral-900/60"
                  >
                    <span>{title}</span>
                    <ArrowIcon className="text-gray-400 dark:text-neutral-500" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-left transition-all duration-200 hover:border-blue-300 dark:border-neutral-800 dark:bg-neutral-900/50 dark:hover:border-blue-500/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  {cat.icon}
                </div>
                <div className="flex w-full items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white">{cat.title}</h3>
                  <ArrowIcon className="text-gray-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-blue-600 dark:text-neutral-500 dark:group-hover:text-blue-400" />
                </div>
                <p className="text-sm text-gray-500 dark:text-neutral-400">{cat.description}</p>
                <span className="text-xs font-medium text-gray-400 dark:text-neutral-500">
                  {cat.articles.length} articles
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
