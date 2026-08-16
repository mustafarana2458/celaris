const APP_VERSION = "Version 1.0.4 - Build 2026.08";

const LEGAL_LINKS = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Data Processing Agreement", href: "#" },
  { label: "Cookie Policy", href: "#" },
];

export function AboutTab() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
        <img src="/celaris-logo.svg" alt="Celaris" className="h-12 w-12 rounded-lg dark:hidden" />
        <img
          src="/celaris-logo-white.png"
          alt="Celaris"
          className="hidden h-12 w-12 rounded-lg dark:block"
        />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Celaris Cloud</h2>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">App Info</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{APP_VERSION}</p>
        <a
          href="#"
          className="mt-3 inline-block text-sm font-medium text-accent hover:text-accent-hover"
        >
          View latest release notes
        </a>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Legal</h3>
        <ul className="mt-4 flex flex-col gap-3">
          {LEGAL_LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-accent hover:text-accent-hover"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Support</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Need assistance?{" "}
          <a href="/resources" className="font-medium text-accent hover:text-accent-hover">
            Visit our Help Center.
          </a>
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Contact Support:{" "}
          <a
            href="mailto:support@celaris.cloud"
            className="font-medium text-accent hover:text-accent-hover"
          >
            support@celaris.cloud
          </a>
        </p>
      </div>

      <p className="text-center text-xs text-slate-400 dark:text-slate-500">
        © {new Date().getFullYear()} Celaris. All rights reserved.
      </p>
    </div>
  );
}
