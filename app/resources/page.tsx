import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { ResourcesContent } from "@/components/marketing/resources/ResourcesContent";

export const metadata: Metadata = {
  title: "Resources — Celaris",
  description: "Search the Celaris help center or browse guides by category.",
};

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <SiteHeader />
      <ResourcesContent />
      <SiteFooter />
    </div>
  );
}
