import type { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Security — Celaris",
  description: "How Celaris protects your workspace and data.",
};

const LAST_UPDATED = "August 11, 2026";

export default function SecurityPage() {
  return (
    <LegalPageLayout title="Security" lastUpdated={LAST_UPDATED}>
      <LegalSection title="Workspace isolation">
        <p>
          Every account belongs to a workspace, and every query against your data is scoped by
          row-level security policies enforced at the database layer. One workspace can never
          read or write another workspace&apos;s contacts, deals, projects, invoices, or team
          records.
        </p>
      </LegalSection>

      <LegalSection title="Authentication">
        <p>
          Sign-in is handled by Supabase Auth — passwords are never stored in plain text. New
          account creation is protected by hCaptcha to block automated signup abuse, and sessions
          are managed with secure, expiring cookies.
        </p>
      </LegalSection>

      <LegalSection title="Access control">
        <p>
          Within a workspace, role-based permissions (owner, admin, member) control what each
          teammate can see and do, down to per-module and per-feature access — for example,
          granting a teammate view-only access to Invoices while giving them full access to
          Deals.
        </p>
      </LegalSection>

      <LegalSection title="Data in transit and at rest">
        <p>
          All traffic between your browser and Celaris is encrypted over HTTPS/TLS. Data at rest
          is encrypted by our underlying infrastructure provider.
        </p>
      </LegalSection>

      <LegalSection title="Responsible disclosure">
        <p>
          If you believe you&apos;ve found a security vulnerability in Celaris, please email{" "}
          <a
            href="mailto:hello@celaris.cloud"
            className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            hello@celaris.cloud
          </a>{" "}
          with details. We ask that you give us a reasonable window to investigate and address
          the issue before any public disclosure.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
