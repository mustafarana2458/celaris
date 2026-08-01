import type { IconName } from "./nav-links";
import { NavIcon } from "./NavIcon";

export function PlaceholderPage({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: IconName;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent">
          <NavIcon name={icon} className="h-6 w-6" />
        </span>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Coming soon</p>
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
          The {title.toLowerCase()} module is on its way. Check back shortly.
        </p>
      </div>
    </div>
  );
}
