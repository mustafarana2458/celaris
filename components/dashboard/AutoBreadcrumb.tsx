"use client";

import { usePathname } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getBreadcrumbItems, getActiveHref } from "./nav-links";
import { useBreadcrumbContext } from "./BreadcrumbContext";

export function AutoBreadcrumb() {
  const pathname = usePathname();
  const { extraLabel } = useBreadcrumbContext();
  const baseItems = getBreadcrumbItems(pathname);

  if (baseItems.length === 0) return null;

  // A detail route (e.g. /dashboard/projects/123) matches its nav leaf
  // (/dashboard/projects) as a prefix, not exactly -- that's the signal to
  // append the dynamic third level once the page has provided one via
  // SetBreadcrumbLabel. Until it does (or for routes with no detail page),
  // the plain 2-level trail is shown.
  const activeHref = getActiveHref(pathname);
  const isDetailRoute = activeHref !== null && pathname !== activeHref;
  const items =
    isDetailRoute && extraLabel ? [...baseItems, { label: extraLabel }] : baseItems;

  return (
    <div className="mb-4">
      <Breadcrumb items={items} />
    </div>
  );
}
