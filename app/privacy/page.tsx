import type { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Privacy Policy — Celaris",
  description: "How Celaris collects, uses, and protects your data.",
};

const LAST_UPDATED = "August 19, 2026";
const CONTACT_EMAIL = "support@celaris.cloud";

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
            <span className="font-medium text-slate-800 dark:text-slate-200">Payment &amp; billing information</span>{" "}
            — if you subscribe to a paid plan, we do not collect or store your full card number,
            bank account details, or other sensitive payment credentials; these are collected
            directly by our payment processors (see Section 5). We do receive limited
            billing-related information from those processors, such as your billing email
            address, the plan and billing interval you selected, subscription/transaction
            status, and an internal workspace reference ID that lets us match a payment to the
            correct workspace.
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
          <li>
            Create, renew, and reconcile subscription payments with our payment processors, and
            update your plan and AI credit allowance accordingly;
          </li>
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

      <LegalSection title="5. Payment Processors">
        <p>
          We use two third-party payment processors to handle subscription payments,
          depending on the payment method you choose. Each processor is PCI-DSS compliant and
          acts as an independent controller of the payment data it collects — we do not receive
          or store your full card number, bank details, or other sensitive payment credentials
          at any point.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-slate-800 dark:text-slate-200">Safepay</span> — used
            for PKR payments made via Pakistani cards, bank transfer, or supported mobile
            wallets. See{" "}
            <a
              href="https://getsafepay.pk/legal/content/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Safepay&apos;s Privacy Policy
            </a>
            .
          </li>
          <li>
            <span className="font-medium text-slate-800 dark:text-slate-200">Lemon Squeezy</span> —
            used for international card payments, where Lemon Squeezy acts as Merchant of
            Record. See{" "}
            <a
              href="https://www.lemonsqueezy.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Lemon Squeezy&apos;s Privacy Policy
            </a>
            .
          </li>
        </ul>
        <p>
          When you make a payment, your payment details are provided directly to and processed
          by the applicable processor. We share only the minimum information necessary to
          create and reconcile your subscription with these processors — such as your billing
          email address and an internal workspace reference ID — so we can match a successful
          payment back to your workspace and adjust your plan accordingly. We do not share your
          Customer Data, physical address, or other account information with payment processors
          beyond what is needed for this purpose.
        </p>
      </LegalSection>

      <LegalSection title="6. Other Third-Party Services">
        <p>
          Besides our payment processors, we work with third-party service providers who help
          us operate the Service, such as hosting and infrastructure providers. These providers
          are given access only to the information necessary to perform their functions and are
          required to protect it in accordance with this Privacy Policy. Some AI-powered
          features may be processed using AI infrastructure that we operate or contract on your
          behalf; we do not use your Customer Data to train third-party AI models.
        </p>
      </LegalSection>

      <LegalSection title="7. Data Sharing">
        <p>We do not sell your personal information or Customer Data. We may share information:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            With our payment processors and other service providers who process data on our
            behalf, as described above;
          </li>
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

      <LegalSection title="8. User Rights">
        <p>
          Depending on your location, you may have rights to access, correct, export, or delete
          the personal information we hold about you, and to object to or restrict certain
          processing. You can update most account information directly within the Service. To
          exercise other rights, contact us using the details below and we will respond in
          accordance with applicable law. Rights relating to payment information held directly
          by Safepay or Lemon Squeezy should also be directed to that processor, using the
          contact details in its own privacy policy (linked in Section 5).
        </p>
      </LegalSection>

      <LegalSection title="9. Data Retention">
        <p>
          We retain your account information and Customer Data for as long as your account is
          active or as needed to provide the Service. If you close your account, we will delete
          or anonymize your data within a reasonable period, except where we are required to
          retain it to comply with legal obligations, resolve disputes, or enforce our
          agreements. Records of past transactions (such as plan, amount, and billing date) may
          be retained for longer where needed for accounting, tax, or legal compliance purposes.
        </p>
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Placeholder: no specific retention period is set out above (e.g. &quot;90 days after
          account closure&quot;) — please confirm whether a fixed retention period should be
          stated, including any minimum period required for transaction/tax records under
          applicable law.
        </p>
      </LegalSection>

      <LegalSection title="10. Children's Privacy">
        <p>
          The Service is intended for business use by adults and is not directed to individuals
          under the age of 16. We do not knowingly collect personal information from children.
          If you believe a child has provided us with personal information, please contact us so
          we can take appropriate action.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to Policy">
        <p>
          We may update this Privacy Policy from time to time to reflect changes to our
          practices or for legal, regulatory, or operational reasons. We will update the
          &quot;Last updated&quot; date above when we do, and for material changes we will make
          reasonable efforts to notify you. Your continued use of the Service after changes take
          effect constitutes acceptance of the revised policy.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>
          If you have questions about this Privacy Policy or how we handle your data, please
          contact us at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
