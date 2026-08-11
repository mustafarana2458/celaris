import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { PricingContent } from "@/components/marketing/pricing/PricingContent";

export const metadata: Metadata = {
  title: "Pricing — Celaris",
  description: "Simple, transparent pricing for teams of every size. Start free, upgrade as you grow.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <SiteHeader />
      <PricingContent />
      <SiteFooter />
    </div>
  );
}
