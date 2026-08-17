"use client";

import { useState } from "react";
import Link from "next/link";

type Billing = "monthly" | "yearly";

type Tier = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyMonthlyPrice: number;
  yearlyTotal: number;
  features: string[];
  cta: { label: string; href: string };
  highlighted?: boolean;
};

const TIERS: Tier[] = [
  {
    id: "solo",
    name: "Solo",
    description: "For freelancers & solopreneurs.",
    monthlyPrice: 25,
    yearlyMonthlyPrice: 21,
    yearlyTotal: 252,
    features: [
      "Full access to core Dashboard & analytical overview",
      "1 user (Admin)",
      "1 workspace",
      "Core modules: Contacts, Deals, Tasks, Invoices",
      "500 AI credits / month",
      "5 GB storage",
      "Basic Module Preferences",
    ],
    cta: { label: "Get started", href: "/signup" },
  },
  {
    id: "team",
    name: "Team",
    description: "For agencies & studios.",
    monthlyPrice: 83,
    yearlyMonthlyPrice: 70,
    yearlyTotal: 840,
    features: [
      "Full access to core Dashboard & analytical overview",
      "Up to 5 users",
      "1 workspace",
      "Full suite — adds Projects & Team Management",
      "2,500 AI credits / month",
      "25 GB storage",
      "Full Workspace Customization",
    ],
    cta: { label: "Get started", href: "/signup" },
    highlighted: true,
  },
  {
    id: "scale",
    name: "Scale",
    description: "For growing SMBs.",
    monthlyPrice: 199,
    yearlyMonthlyPrice: 165,
    yearlyTotal: 1980,
    features: [
      "Full access to core Dashboard & analytical overview",
      "Unlimited users",
      "Up to 3 workspaces",
      "Full suite — adds Priority Support & Custom Onboarding",
      "10,000 AI credits / month",
      "100 GB storage",
      "Full Workspace Customization",
    ],
    cta: { label: "Get started", href: "/signup" },
  },
];

// Highest per-tier saving across all plans, so the toggle badge stays accurate
// if a tier's yearly price ever changes -- avoids hardcoding a flat "20%"
// that only some tiers actually hit.
const MAX_YEARLY_SAVINGS_PERCENT = Math.max(
  ...TIERS.map((tier) => Math.round((1 - tier.yearlyMonthlyPrice / tier.monthlyPrice) * 100))
);

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

export function PricingContent() {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 lg:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-lg text-slate-500 dark:text-neutral-400">
          Pick the plan that fits your team. Upgrade anytime as you grow. No hidden fees.
        </p>
      </div>

      <div className="mt-10 flex flex-col items-center gap-3">
        <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 p-1 dark:border-neutral-800 dark:bg-neutral-900">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors duration-200 ${
              billing === "monthly"
                ? "bg-white text-slate-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                : "text-slate-500 dark:text-neutral-400"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("yearly")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors duration-200 ${
              billing === "yearly"
                ? "bg-white text-slate-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                : "text-slate-500 dark:text-neutral-400"
            }`}
          >
            Yearly
          </button>
        </div>
        {billing === "yearly" && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            Save up to {MAX_YEARLY_SAVINGS_PERCENT}%
          </span>
        )}
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-center">
        {TIERS.map((tier) => {
          const price = billing === "yearly" ? tier.yearlyMonthlyPrice : tier.monthlyPrice;

          return (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 ${
                tier.highlighted
                  ? "border-blue-500 bg-white shadow-xl dark:border-blue-500 dark:bg-neutral-900 dark:shadow-[0_0_20px_rgba(59,130,246,0.2)] lg:scale-105"
                  : "border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-md">
                  Most Popular
                </span>
              )}

              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{tier.name}</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">{tier.description}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">${price}</span>
                <span className="text-sm text-slate-500 dark:text-neutral-400">/month</span>
              </div>
              {billing === "yearly" && (
                <p className="mt-1 text-xs text-slate-400 dark:text-neutral-500">
                  Billed annually at ${tier.yearlyTotal}/year
                </p>
              )}

              <Link
                href={tier.cta.href}
                className={`mt-8 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                  tier.highlighted
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "border border-gray-200 text-slate-700 hover:bg-gray-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                }`}
              >
                {tier.cta.label}
              </Link>

              <ul className="mt-8 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-slate-600 dark:text-neutral-300">
                    <CheckIcon />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
