import Link from "next/link";
import { ReactNode } from "react";
import { AuthShowcase } from "@/components/auth/AuthShowcase";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white dark:bg-neutral-950">
      <AuthShowcase />

      <div className="relative flex flex-1 flex-col px-4 py-12">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-md">
            <Link
              href="/"
              className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold text-gray-900 dark:text-white"
            >
              <img src="/celaris-logo.svg" alt="Celaris" className="h-8 w-8 rounded-lg" />
              Celaris
            </Link>

            <div className="mb-6 text-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">{subtitle}</p>
            </div>

            {children}

            <p className="mt-6 text-center text-sm text-gray-500 dark:text-neutral-400">{footer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
