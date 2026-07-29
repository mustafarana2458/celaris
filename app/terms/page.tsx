import type { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Terms and Conditions — Celaris",
  description: "The terms and conditions governing use of Celaris.",
};

const LAST_UPDATED = "July 29, 2026";

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

      <LegalSection title="3. User Accounts">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            You must provide accurate, current, and complete information when creating an
            account and keep that information up to date.
          </li>
          <li>
            You are responsible for safeguarding your account credentials and for all activity
            that occurs under your account.
          </li>
          <li>
            You must notify us promptly of any unauthorized use of your account or any other
            breach of security.
          </li>
          <li>
            You must be legally able to enter into a binding contract to create an account and
            use the Service.
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
            Use the Service&apos;s AI features to generate content that is unlawful, abusive,
            deceptive, or infringing.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Subscriptions & Payments">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Certain features of the Service require a paid subscription. Pricing and plan
            details are made available within the Service or on our website.
          </li>
          <li>
            Subscription fees are billed in advance on a recurring basis (e.g. monthly or
            annually) and are non-refundable except where required by law or expressly stated
            otherwise.
          </li>
          <li>
            We may change subscription pricing with reasonable advance notice. Continued use of
            the Service after a price change takes effect constitutes acceptance of the new
            pricing.
          </li>
          <li>
            Failure to pay applicable fees may result in suspension or termination of your
            access to paid features.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Intellectual Property">
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

      <LegalSection title="7. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, the Service is provided &quot;as is&quot; and
          &quot;as available&quot; without warranties of any kind, whether express or implied.
          Celaris shall not be liable for any indirect, incidental, special, consequential,
          or punitive damages, or any loss of profits, revenue, data, or goodwill, arising from
          or related to your use of the Service, including reliance on AI-generated content,
          which may be inaccurate or incomplete and should be reviewed before use. Our total
          liability for any claim arising out of these Terms or the Service shall not exceed the
          amount you paid us in the twelve (12) months preceding the claim.
        </p>
      </LegalSection>

      <LegalSection title="8. Termination">
        <p>
          You may stop using the Service and close your account at any time. We may suspend or
          terminate your access to the Service, in whole or in part, if you violate these Terms,
          fail to pay applicable fees, or if we reasonably believe termination is necessary to
          protect the Service or other users. Upon termination, your right to use the Service
          will immediately cease, and we may delete your account data in accordance with our
          Privacy Policy and applicable data retention obligations.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes to Terms">
        <p>
          We may update these Terms from time to time to reflect changes to the Service or for
          legal, regulatory, or operational reasons. We will update the &quot;Last updated&quot;
          date above when we do, and for material changes we will make reasonable efforts to
          notify you (such as by email or an in-app notice). Your continued use of the Service
          after changes take effect constitutes acceptance of the revised Terms.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          If you have questions about these Terms, please contact us at{" "}
          <a href="mailto:legal@celaris.com" className="text-blue-600 hover:underline">
            legal@celaris.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
