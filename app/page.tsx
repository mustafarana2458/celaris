import Link from "next/link";
import { NavIcon } from "@/components/dashboard/NavIcon";
import type { IconName } from "@/components/dashboard/nav-links";

const features: { title: string; description: string; icon: IconName }[] = [
  {
    title: "Contacts & CRM",
    description: "Keep every customer and lead organized in one place.",
    icon: "users",
  },
  {
    title: "Deals pipeline",
    description: "Track opportunities from first touch to closed-won.",
    icon: "trending",
  },
  {
    title: "Projects & tasks",
    description: "Plan the work and keep your team moving.",
    icon: "check",
  },
  {
    title: "Invoicing",
    description: "Bill clients and get paid, without the spreadsheets.",
    icon: "invoice",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            C
          </span>
          Celaris
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20 text-center">
        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          All-in-one business management
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Run your entire business from one clean dashboard
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
          Contacts, deals, projects, tasks, invoices and your team — Celaris
          brings it all together so you can focus on growth.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            Start for free
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-5 text-left sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <NavIcon name={feature.icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">
                {feature.title}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400">
        <p>© {new Date().getFullYear()} Celaris. All rights reserved.</p>
        <div className="mt-2 flex items-center justify-center gap-4">
          <Link href="/terms" className="hover:text-slate-600 hover:underline">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-slate-600 hover:underline">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
