import Link from "next/link";
import { NavIcon } from "@/components/dashboard/NavIcon";
import type { IconName } from "@/components/dashboard/nav-links";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

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
      <header className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#030014]/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-md shadow-blue-600/25">
              C
            </span>
            <span className="text-lg font-semibold tracking-tight dark:text-white">
              Celaris
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:bg-blue-500 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

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
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
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

        {/* Dashboard preview mockup - hidden from screen readers for accessibility */}
        <div className="relative mx-auto mt-24 max-w-5xl" aria-hidden="true">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 dark:shadow-black/30">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-white/5">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                <div className="h-3 w-3 rounded-full bg-green-500/70" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-3">
                  <div className="h-4 w-3/4 rounded-full bg-slate-200 dark:bg-white/5" />
                  <div className="h-4 w-1/2 rounded-full bg-slate-200 dark:bg-white/5" />
                  <div className="h-4 w-5/6 rounded-full bg-slate-200 dark:bg-white/5" />
                </div>
                <div className="space-y-3">
                  <div className="h-8 w-full rounded-lg bg-blue-100 dark:bg-blue-500/10" />
                  <div className="h-8 w-full rounded-lg bg-blue-100 dark:bg-blue-500/10" />
                  <div className="h-8 w-full rounded-lg bg-blue-100 dark:bg-blue-500/10" />
                </div>
              </div>
              <div className="mt-6 grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-20 rounded-lg bg-gradient-to-b from-slate-100 to-transparent dark:from-white/5 dark:to-transparent"
                  />
                ))}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-slate-100 dark:ring-white/10" />
          </div>
          <div className="absolute -inset-4 -z-10 rounded-2xl bg-gradient-to-r from-blue-200 via-blue-100 to-transparent opacity-20 blur-2xl dark:from-blue-600/20 dark:via-blue-500/20 dark:to-purple-500/20 dark:opacity-30" />
        </div>

        {/* Feature cards */}
        <div className="mt-24 grid grid-cols-1 gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-500/30 dark:hover:bg-white/10 dark:hover:shadow-lg dark:hover:shadow-blue-500/10"
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
              href="mailto:sales@celaris.cloud"
              className="rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
            >
              Talk to sales
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/50 backdrop-blur-md dark:border-white/5 dark:bg-black/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-center sm:flex-row">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} Celaris. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-slate-400 dark:text-slate-500">
            <Link href="/terms" className="transition-colors hover:text-blue-600 dark:hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-blue-600 dark:hover:text-white">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}