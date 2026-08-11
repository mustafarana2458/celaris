import Link from "next/link";

export function SiteFooter() {
  return (
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
  );
}
