import Link from "next/link";
import { ReactNode } from "react";

export function LegalPageLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"
        >
          <img src="/celaris-logo.svg" alt="Celaris" className="h-8 w-8 rounded-lg dark:hidden" />
          <img
            src="/celaris-logo-white.png"
            alt="Celaris"
            className="hidden h-8 w-8 rounded-lg dark:block"
          />
          Celaris
        </Link>
        <Link
          href="/"
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
        >
          Back to home
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-4">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Last updated: {lastUpdated}</p>

        <div className="mt-10 flex flex-col gap-8">{children}</div>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400 dark:border-neutral-800 dark:text-slate-500">
        © {new Date().getFullYear()} Celaris. All rights reserved.
      </footer>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
      <div className="mt-2 flex flex-col gap-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {children}
      </div>
    </section>
  );
}
