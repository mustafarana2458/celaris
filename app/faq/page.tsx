import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { FaqContent } from "@/components/marketing/faq/FaqContent";

export const metadata: Metadata = {
  title: "FAQ — Celaris",
  description: "Frequently asked questions about Celaris.",
};

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <SiteHeader />
      <FaqContent />
      <SiteFooter />
    </div>
  );
}
