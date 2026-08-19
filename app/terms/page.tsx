import type { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Terms and Conditions — Celaris",
  description: "The terms and conditions governing use of Celaris.",
};

const LAST_UPDATED = "August 19, 2026";
const CONTACT_EMAIL = "support@celaris.cloud";

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms and Conditions" lastUpdated={LAST_UPDATED}>
      <LegalSection title="1. Acceptance of Terms">
        <p>
          These Terms and Conditions (&quot;Terms&quot;) form a binding agreement between you
          (&quot;you&quot; or &quot;User&quot;) and Celaris (&quot;Celaris,&quot;
          &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) governing your access to and use of
          the Celaris website, application, and related services (collectively, the
          &quot;Service&quot;). By creating an account, accessing, or using the Service, you
          agree to be bound by these Terms. If you do not agree, do not use the Service.
        </p>
      </LegalSection>

      <LegalSection title="2. Description of Service">
        <p>
          Celaris is an all-in-one business management platform that provides tools for
          contact and customer relationship management (CRM), sales pipeline tracking, project
          and task management, invoicing, team collaboration, and AI-powered features such as
          drafting follow-up messages, scoring leads, answering questions about your business
          data, and generating business insights. We may add, change, or remove features of the
          Service at any time.
        </p>
      </LegalSection>

      <LegalSection title="3. Eligibility & Accounts">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            You must be legally able to enter into a binding contract — either on your own
            behalf or on behalf of a business you are authorized to represent — to create an
            account and use the Service.
          </li>
          <li>
            You must provide accurate, current, and complete information when creating an
            account and keep that information up to date.
          </li>
          <li>
            You are responsible for safeguarding your account credentials and for all activity
            that occurs under your account, including activity by other members you invite to
            your workspace.
          </li>
          <li>
            You must notify us promptly of any unauthorized use of your account or any other
            breach of security.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Acceptable Use">
        <p>You agree not to use the Service to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Violate any applicable law, regulation, or the rights of any third party;</li>
          <li>
            Upload or transmit data you do not have the right to store or process, including
            data belonging to other individuals collected without proper consent;
          </li>
          <li>
            Attempt to gain unauthorized access to the Service, other accounts, or the systems
            or networks connected to the Service;
          </li>
          <li>
            Interfere with or disrupt the integrity or performance of the Service, including
            through excessive automated requests;
          </li>
          <li>
            Reverse engineer, decompile, or attempt to extract the source code of the Service,
            except where permitted by law;
          </li>
          <li>
            Attempt to circumvent, defraud, or abuse the Service&apos;s billing, subscription,
            or AI credit systems;
          </li>
          <li>
            Use the Service&apos;s AI features to generate content that is unlawful, abusive,
            deceptive, or infringing.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Subscriptions & Billing">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Certain features of the Service require a paid subscription. Paid plans are
            currently offered in three tiers — Solo, Team, and Scale — each available on a
            monthly or yearly billing cycle. Plan features, AI credit allowances, and usage
            limits are described within the Service and on our website, and may be updated from
            time to time as described in Section 2.
          </li>
          <li>
            Subscriptions are billed in advance and renew automatically at the end of each
            billing period (monthly or yearly, matching your selected plan) until you cancel. By
            subscribing, you authorize us and our payment processors (see Section 6) to charge
            your chosen payment method on this recurring basis.
          </li>
          <li>
            We may change subscription pricing for future billing periods with reasonable
            advance notice, such as by email or an in-app notice. A price change will not apply
            to a period you have already paid for; continued use of the Service after a price
            change takes effect for your next renewal constitutes acceptance of the new pricing.
          </li>
          <li>
            If a scheduled payment fails, or your subscription otherwise lapses without being
            renewed, your workspace will keep its current plan&apos;s access until the end of
            the billing period already paid for. After that, your workspace automatically moves
            to the free plan — we do not delete your account or Customer Data as a result of a
            failed payment or downgrade.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Payment Processing & Payment Processors">
        <p>
          We do not process or store your full payment card number, bank account details, or
          other sensitive payment credentials ourselves. All payments are handled by one of two
          third-party payment processors, depending on the option you choose at checkout:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-slate-800 dark:text-slate-200">Safepay</span> —
            for customers paying in Pakistani Rupees (PKR), typically via Pakistani debit/credit
            cards, bank transfer, or supported mobile wallets. Safepay processes these
            transactions as our designated local payment processor, and Celaris remains the
            merchant of record for them.
          </li>
          <li>
            <span className="font-medium text-slate-800 dark:text-slate-200">Lemon Squeezy</span>{" "}
            — for customers paying by international card. Lemon Squeezy acts as the{" "}
            <span className="font-medium text-slate-800 dark:text-slate-200">
              Merchant of Record (MoR)
            </span>{" "}
            for these transactions: Lemon Squeezy is the seller of record for the purchase,
            appears as the merchant on your card statement, and is responsible for calculating,
            collecting, and remitting applicable sales tax, VAT, or similar taxes on that
            transaction on our behalf.
          </li>
        </ul>
        <p>
          Your use of either payment method is also subject to that processor&apos;s own terms
          of service and privacy policy, in addition to these Terms. See our{" "}
          <a href="/privacy" className="text-blue-600 hover:underline dark:text-blue-400">
            Privacy Policy
          </a>{" "}
          for links to each processor&apos;s policy and further detail on how they handle your
          payment information. We are not responsible for, and disclaim liability for, errors,
          delays, or disputes arising from a payment processor&apos;s own systems, except to the
          extent caused by our own breach of these Terms.
        </p>
      </LegalSection>

      <LegalSection title="7. Cancellation & Refunds">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            You may cancel your subscription at any time from within the Service (Settings &gt;
            Billing) or by contacting us. Cancelling stops future renewals; you keep access to
            your plan&apos;s paid features until the end of the billing period you already paid
            for, after which your workspace moves to the free plan.
          </li>
          <li>
            We do not generally offer refunds or credits for partial subscription periods,
            unused features, or mid-cycle cancellations, except where required by applicable law
            or where we agree to one at our discretion on a case-by-case basis.
          </li>
          <li>
            Refund requests are also subject to the policy of whichever processor handled your
            payment: Safepay&apos;s own refund and dispute process for PKR payments, or Lemon
            Squeezy&apos;s own refund policy for international card payments (since Lemon
            Squeezy is the seller of record for those transactions).
          </li>
          <li>
            To request a refund or dispute a charge, contact us at the email in Section 15 and
            we will review your request in good faith.
          </li>
        </ul>
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Placeholder policy: cancel-anytime with access continuing until period end, and
          case-by-case refunds, is a reasonable, commonly-used SaaS default — please confirm
          this matches your intended refund policy before this page goes live.
        </p>
      </LegalSection>

      <LegalSection title="8. Taxes">
        <p>
          For transactions processed by Lemon Squeezy as Merchant of Record, Lemon Squeezy is
          responsible for determining, collecting, and remitting any applicable sales tax, VAT,
          GST, or similar transaction taxes, reflected in the price charged at checkout. For
          transactions processed by Safepay, Celaris remains the merchant of record and is
          responsible for any taxes applicable to that transaction under Pakistani law.
        </p>
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Please confirm with your accountant or tax advisor whether Safepay-processed prices
          need to be explicitly labelled inclusive/exclusive of tax, and whether Celaris needs
          to be registered for sales tax in Pakistan.
        </p>
      </LegalSection>

      <LegalSection title="9. Intellectual Property">
        <p>
          The Service, including its software, design, text, graphics, and other content
          (excluding data you submit), is owned by Celaris or its licensors and is protected
          by intellectual property laws. We grant you a limited, non-exclusive,
          non-transferable license to access and use the Service for your internal business
          purposes, subject to these Terms. You retain all rights to the data and content you
          submit to the Service (&quot;Customer Data&quot;), and you grant us a limited license
          to host, process, and display Customer Data solely to provide and improve the Service
          to you.
        </p>
      </LegalSection>

      <LegalSection title="10. Disclaimer of Warranties & Service Availability">
        <p>
          To the maximum extent permitted by law, the Service is provided &quot;as is&quot; and
          &quot;as available&quot; without warranties of any kind, whether express or implied.
          We do not guarantee that the Service will be uninterrupted, error-free, or available
          at all times. We may perform scheduled maintenance, experience unplanned outages, or
          modify or discontinue features — including AI-powered features, which may depend on
          third-party AI infrastructure — and will make reasonable efforts to give advance
          notice of material changes where practical.
        </p>
      </LegalSection>

      <LegalSection title="11. Limitation of Liability">
        <p>
          Celaris shall not be liable for any indirect, incidental, special, consequential,
          or punitive damages, or any loss of profits, revenue, data, or goodwill, arising from
          or related to your use of the Service, including reliance on AI-generated content,
          which may be inaccurate or incomplete and should be reviewed before use. Our total
          liability for any claim arising out of these Terms or the Service shall not exceed the
          amount you paid us in the twelve (12) months preceding the claim.
        </p>
      </LegalSection>

      <LegalSection title="12. Termination">
        <p>
          You may stop using the Service and close your account at any time. We may suspend or
          terminate your access to the Service, in whole or in part, if you violate these Terms,
          fail to pay applicable fees, or if we reasonably believe termination is necessary to
          protect the Service or other users. Upon termination, your right to use the Service
          will immediately cease, and we may delete your account data in accordance with our
          Privacy Policy and applicable data retention obligations.
        </p>
      </LegalSection>

      <LegalSection title="13. Governing Law">
        <p>
          These Terms are governed by the laws of Pakistan, without regard to its conflict of
          laws principles, and any dispute arising out of or relating to these Terms or the
          Service shall be subject to the exclusive jurisdiction of the courts of Pakistan.
        </p>
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Placeholder: Pakistan was used as a reasonable default given Safepay is a Pakistani
          payment processor, but please confirm the governing-law jurisdiction against where
          Celaris is actually incorporated/operated — this may need to differ given Lemon
          Squeezy&apos;s international Merchant-of-Record relationship.
        </p>
      </LegalSection>

      <LegalSection title="14. Changes to These Terms">
        <p>
          We may update these Terms from time to time to reflect changes to the Service or for
          legal, regulatory, or operational reasons. We will update the &quot;Last updated&quot;
          date above when we do, and for material changes we will make reasonable efforts to
          notify you (such as by email or an in-app notice). Your continued use of the Service
          after changes take effect constitutes acceptance of the revised Terms.
        </p>
      </LegalSection>

      <LegalSection title="15. Contact">
        <p>
          If you have questions about these Terms, please contact us at{" "}
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
