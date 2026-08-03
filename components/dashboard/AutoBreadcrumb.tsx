"use client";

import { usePathname } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getBreadcrumbItems } from "./nav-links";

export function AutoBreadcrumb() {
  const pathname = usePathname();
  const items = getBreadcrumbItems(pathname);

  if (items.length === 0) return null;

  return (
    <div className="mb-4">
      <Breadcrumb items={items} />
    </div>
  );
}
