import Link from "next/link";
import { ReactNode } from "react";

const PRODUCT_LINKS = [
  { label: "Dashboard", href: "/" },
  { label: "CRM", href: "/features#contacts" },
  { label: "Deals", href: "/features#deals" },
  { label: "Invoices", href: "/features#invoices" },
  { label: "Team", href: "/features#team" },
];

const RESOURCES_LINKS = [
  { label: "Help Center", href: "/resources" },
  { label: "FAQ", href: "/faq" },
  { label: "System Status", href: "/status" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Security", href: "/security" },
];

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white"
    >
      {children}
    </Link>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <FooterLink href={link.href}>{link.label}</FooterLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <img src="/celaris-logo.svg" alt="Celaris" className="h-8 w-8 rounded-lg dark:hidden" />
              <img
                src="/celaris-logo-white.png"
                alt="Celaris"
                className="hidden h-8 w-8 rounded-lg dark:block"
              />
              Celaris
            </Link>
            <p className="mt-3 text-sm text-gray-500 dark:text-neutral-400">
              Architecting business ecosystems.
            </p>
            <a
              href="mailto:hello@celaris.cloud"
              className="mt-4 inline-block text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white"
            >
              hello@celaris.cloud
            </a>
          </div>

          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Resources" links={RESOURCES_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-8 text-sm text-gray-400 dark:border-neutral-800 dark:text-neutral-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Celaris. All rights reserved.</p>
          <p>
            Engineered by{" "}
            <a
              href="https://aevia.site"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-900 transition-colors hover:text-blue-500 dark:text-white dark:hover:text-blue-500"
            >
              Aevia
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
