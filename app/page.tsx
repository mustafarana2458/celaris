import Link from "next/link";
import { NavIcon } from "@/components/dashboard/NavIcon";
import type { IconName } from "@/components/dashboard/nav-links";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { DashboardMockup } from "@/components/marketing/DashboardMockup";

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

export default async function Home() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-slate-800 transition-colors duration-300 selection:bg-blue-600/20 dark:bg-[#030014] dark:text-slate-200">
      {/* Background patterns (light/dark) */}
      <div className="absolute inset-0 -z-10">
        {/* Light mode pattern */}
        <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48cGF0aCBkPSJNMzAgMzBhMTUgMTUgMCAwIDEgMCAzMCAxNSAxNSAwIDAgMSAwLTMweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTJlOGYwIiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC40Ii8+PC9zdmc+')] bg-[length:60px_60px] dark:hidden" />
        
        {/* Dark mode orbs - Optimized for GPU to prevent scrolling lag */}
        <div className="absolute left-1/4 top-1/4 hidden h-[500px] w-[500px] animate-pulse rounded-full bg-blue-600/10 blur-[120px] will-change-transform transform-gpu dark:block" />
        <div
          className="absolute bottom-1/3 right-1/4 hidden h-[400px] w-[400px] animate-pulse rounded-full bg-blue-500/10 blur-[100px] will-change-transform transform-gpu dark:block"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute left-1/2 top-2/3 hidden h-[300px] w-[300px] animate-pulse rounded-full bg-blue-400/10 blur-[90px] will-change-transform transform-gpu dark:block"
          style={{ animationDelay: "4s" }}
        />
        
        {/* Light mode soft blobs */}
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl dark:hidden" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl dark:hidden" />
      </div>

      {/* Navbar */}
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-20 text-center">
        {/* Hero */}
        <div className="mx-auto max-w-4xl">
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
            All-in-one business management
          </span>
          <h1 className="mt-8 text-5xl font-bold tracking-tight dark:text-white sm:text-6xl lg:text-7xl">
            Run your entire business
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-300">
              from one clean dashboard
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-500 dark:text-slate-400">
            Contacts, deals, projects, tasks, invoices, and your team — Celaris
            brings it all together so you can focus on growth, not on switching
            tabs.
          </p>
          <div className="relative mt-10 flex flex-wrap items-center justify-center gap-4">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 hidden h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20 blur-3xl dark:block"
            />
            <Link
              href="/signup"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:scale-105 hover:shadow-blue-600/40 dark:shadow-blue-600/25"
            >
              <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
              Start for free →
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Dashboard preview mockup */}
        <DashboardMockup />

        {/* Feature cards */}
        <div className="mt-24 grid grid-cols-1 gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-blue-500/50 dark:hover:shadow-lg dark:hover:shadow-blue-500/10"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/25 transition-transform group-hover:scale-110">
                <NavIcon name={feature.icon} className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-base font-semibold dark:text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA strip */}
        <div className="mt-24 rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-blue-50 p-10 backdrop-blur-sm dark:border-white/10 dark:bg-gradient-to-r dark:from-blue-500/10 dark:via-violet-500/10 dark:to-blue-500/10">
          <h2 className="text-2xl font-bold dark:text-white sm:text-3xl">
            Ready to streamline your workflow?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-500 dark:text-slate-400">
            Join thousands of teams already managing their business with
            Celaris.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              Start for free
            </Link>
            <Link
              href="mailto:hello@aevia.site"
              className="rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
            >
              Talk to sales
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}