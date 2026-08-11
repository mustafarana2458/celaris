import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { FeaturesContent } from "@/components/marketing/features/FeaturesContent";

export const metadata: Metadata = {
  title: "Features — Celaris",
  description:
    "Contacts, deals, projects, invoices, and team management — everything Celaris brings together in one workspace.",
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <SiteHeader />
      <FeaturesContent />
      <SiteFooter />
    </div>
  );
}
