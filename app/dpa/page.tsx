import type { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Data Processing Agreement — Celaris",
  description: "Terms governing how Celaris processes personal data on your behalf.",
};

const LAST_UPDATED = "August 17, 2026";

export default function DpaPage() {
  return (
    <LegalPageLayout title="Data Processing Agreement" lastUpdated={LAST_UPDATED}>
      <LegalSection title="1. Purpose">
        <p>
          This Data Processing Agreement (&quot;DPA&quot;) describes how Celaris handles personal
          data that you (the &quot;Customer&quot;) submit to the Service as part of your
          Customer Data — for example, the names, emails, and phone numbers of your contacts. It
          supplements our{" "}
          <a href="/terms" className="text-blue-600 hover:underline dark:text-blue-400">Terms of Service</a>{" "}
          and{" "}
          <a href="/privacy" className="text-blue-600 hover:underline dark:text-blue-400">Privacy Policy</a>.
        </p>
      </LegalSection>

      <LegalSection title="2. Roles">
        <p>
          For personal data you enter into your workspace (your contacts, leads, and team
          members&apos; details), you act as the <span className="font-medium text-slate-800 dark:text-slate-200">data controller</span> and
          Celaris acts as the <span className="font-medium text-slate-800 dark:text-slate-200">data processor</span>, processing that data
          only to provide the Service to you and on your instructions.
        </p>
        <p>
          For your own account information (your name, email, and login credentials), Celaris
          acts as the controller, as described in our Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection title="3. Scope of Processing">
        <p>
          Celaris processes Customer Data solely to operate the Service: storing and displaying
          your records, running the features you use (invoicing, task management, pipeline
          tracking, and similar), generating AI-assisted outputs you request (such as summaries
          or drafted messages), and providing customer support when you contact us.
        </p>
        <p>
          We do not use Customer Data for advertising, and we do not sell it or use it to train
          third-party AI models.
        </p>
      </LegalSection>

      <LegalSection title="4. Sub-processors">
        <p>
          Celaris uses a limited set of infrastructure sub-processors to operate the Service,
          principally Supabase for database hosting, authentication, and file storage, and the
          AI inference providers described in our Privacy Policy for AI-assisted features. Each
          sub-processor is engaged only to perform a specific function needed to run the Service
          and is bound to protect data it processes accordingly.
        </p>
      </LegalSection>

      <LegalSection title="5. Data Isolation & Security">
        <p>
          Your workspace&apos;s data is logically isolated from every other workspace using
          row-level security enforced at the database layer — no query can span across
          workspaces. Access within your workspace is further governed by the role- and
          module-level permissions you configure for your own team. Traffic between your browser
          and Celaris is encrypted over HTTPS/TLS.
        </p>
      </LegalSection>

      <LegalSection title="6. Data Subject Requests">
        <p>
          If one of your contacts or team members asks you to access, correct, or delete their
          personal data, you can do so directly within the Service — editing or deleting a
          contact, task, or team record takes effect immediately. If you need assistance beyond
          what&apos;s available in-app, contact us using the details below.
        </p>
      </LegalSection>

      <LegalSection title="7. Data Deletion">
        <p>
          When you delete a record in the Service, it is removed from your workspace immediately.
          When an account is closed, we delete or anonymize the associated Customer Data within a
          reasonable period, except where retention is required to meet a legal obligation, as
          described in our Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection title="8. International Transfers">
        <p>
          Where personal data is processed or stored outside your own country by Celaris or a
          sub-processor, we rely on that provider&apos;s own security and compliance measures to
          protect it in transit and at rest, consistent with this DPA.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes">
        <p>
          We may update this DPA to reflect changes in how the Service operates or in applicable
          law. We&apos;ll update the &quot;Last updated&quot; date above whenever we do.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          Questions about this DPA, or requests related to data processing, can be sent to{" "}
          <a
            href="mailto:privacy@celaris.com"
            className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            privacy@celaris.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
