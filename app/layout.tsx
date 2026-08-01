import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Celaris — All-in-one business management",
  description: "Contacts, deals, projects, tasks, invoices and your team in one place.",
};

// Runs before hydration so dark mode / accent color apply on first paint,
// on every page — not only pages that happen to mount useTheme(). Keep the
// ACCENTS map in sync with ACCENT_PALETTE in lib/theme.ts by hand; this
// script must be a static string, it can't import that module.
const THEME_INIT_SCRIPT = `(function () {
  try {
    var mode = localStorage.getItem('theme') || 'system';
    var isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);

    var ACCENTS = {
      '#2563EB': ['37 99 235', '29 78 216'],
      '#10B981': ['16 185 129', '4 120 87'],
      '#7C3AED': ['124 58 237', '109 40 217'],
      '#F59E0B': ['245 158 11', '180 83 9']
    };
    var accent = localStorage.getItem('accentColor');
    var pair = ACCENTS[accent] || ACCENTS['#2563EB'];
    document.documentElement.style.setProperty('--accent-rgb', pair[0]);
    document.documentElement.style.setProperty('--accent-dark-rgb', pair[1]);
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased dark:bg-slate-900 dark:text-slate-100`}>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}