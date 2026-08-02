import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600"
                aria-hidden
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-slate-500 hover:text-accent-hover dark:text-slate-400 dark:hover:text-accent"
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={isLast ? "page" : undefined}
                className="font-medium text-slate-700 dark:text-slate-200"
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
