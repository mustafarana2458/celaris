import type { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Privacy Policy — Celaris",
  description: "How Celaris collects, uses, and protects your data.",
};

const LAST_UPDATED = "July 29, 2026";

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <LegalSection title="1. Information We Collect">
        <p>We collect the following types of information:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-slate-800 dark:text-slate-200">Account information</span> — your name,
            business name, email address, phone number, and password, provided when you sign up.
          </li>
          <li>
            <span className="font-medium text-slate-800 dark:text-slate-200">Customer Data</span> — the contacts,
            deals, projects, tasks, invoices, and other business records you create or upload
            while using the Service.
          </li>
          <li>
            <span className="font-medium text-slate-800 dark:text-slate-200">Usage data</span> — information about
            how you interact with the Service, such as pages visited and features used.
          </li>
          <li>
            <span className="font-medium text-slate-800 dark:text-slate-200">Device and log data</span> — IP
            address, browser type, and similar technical information collected automatically.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How We Use Information">
        <p>We use the information we collect to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Provide, operate, and maintain the Service, including your workspace and data;</li>
          <li>
            Power AI-based features (such as drafting follow-up messages, scoring leads,
            answering questions about your workspace data, and generating business insights),
            which process a summary or relevant portion of your Customer Data to produce
            responses on your behalf;
          </li>
          <li>Process subscription payments and manage your account;</li>
          <li>Communicate with you about updates, security alerts, and support;</li>
          <li>Monitor, troubleshoot, and improve the Service&apos;s performance and reliability;</li>
          <li>Detect, prevent, and address fraud, abuse, and security issues.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Data Storage & Security">
        <p>
          Your data is stored using industry-standard database and hosting infrastructure, with
          access controls designed to keep each workspace&apos;s data isolated from other
          workspaces. We use reasonable technical and organizational measures — including
          encryption in transit, authentication, and role-based access — to protect your data
          against unauthorized access, alteration, disclosure, or destruction. No method of
          transmission or storage is completely secure, and we cannot guarantee absolute
          security.
        </p>
      </LegalSection>

      <LegalSection title="4. Cookies">
        <p>
          We use cookies and similar technologies to keep you signed in, remember your
          preferences, and understand how the Service is used. Essential cookies are required
          for the Service to function (for example, maintaining your login session); you can
          control non-essential cookies through your browser settings, though disabling them may
          affect the functionality of the Service.
        </p>
      </LegalSection>

      <LegalSection title="5. Third-Party Services">
        <p>
          We work with third-party service providers who help us operate the Service, such as
          hosting and infrastructure providers and payment processors. These providers are
          given access only to the information necessary to perform their functions and are
          required to protect it in accordance with this Privacy Policy. Some AI-powered
          features may be processed using AI infrastructure that we operate or contract on your
          behalf; we do not use your Customer Data to train third-party AI models.
        </p>
      </LegalSection>

      <LegalSection title="6. Data Sharing">
        <p>We do not sell your personal information or Customer Data. We may share information:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>With service providers who process data on our behalf, as described above;</li>
          <li>With other members of your workspace, as intended by the Service&apos;s design;</li>
          <li>
            To comply with a legal obligation, protect our rights, or respond to a lawful
            request from a public authority;
          </li>
          <li>
            In connection with a merger, acquisition, or sale of assets, subject to continued
            protection under this Privacy Policy or a materially similar policy.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="7. User Rights">
        <p>
          Depending on your location, you may have rights to access, correct, export, or delete
          the personal information we hold about you, and to object to or restrict certain
          processing. You can update most account information directly within the Service. To
          exercise other rights, contact us using the details below and we will respond in
          accordance with applicable law.
        </p>
      </LegalSection>

      <LegalSection title="8. Data Retention">
        <p>
          We retain your account information and Customer Data for as long as your account is
          active or as needed to provide the Service. If you close your account, we will delete
          or anonymize your data within a reasonable period, except where we are required to
          retain it to comply with legal obligations, resolve disputes, or enforce our
          agreements.
        </p>
      </LegalSection>

      <LegalSection title="9. Children's Privacy">
        <p>
          The Service is intended for business use by adults and is not directed to individuals
          under the age of 16. We do not knowingly collect personal information from children.
          If you believe a child has provided us with personal information, please contact us so
          we can take appropriate action.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes to Policy">
        <p>
          We may update this Privacy Policy from time to time to reflect changes to our
          practices or for legal, regulatory, or operational reasons. We will update the
          &quot;Last updated&quot; date above when we do, and for material changes we will make
          reasonable efforts to notify you. Your continued use of the Service after changes take
          effect constitutes acceptance of the revised policy.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>
          If you have questions about this Privacy Policy or how we handle your data, please
          contact us at{" "}
          <a href="mailto:privacy@celaris.com" className="text-blue-600 hover:underline dark:text-blue-400">
            privacy@celaris.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
