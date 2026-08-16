import type { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Cookie Policy — Celaris",
  description: "How Celaris uses cookies and similar technologies.",
};

const LAST_UPDATED = "August 17, 2026";

export default function CookiePolicyPage() {
  return (
    <LegalPageLayout title="Cookie Policy" lastUpdated={LAST_UPDATED}>
      <LegalSection title="1. What Cookies Are">
        <p>
          Cookies are small text files stored in your browser when you visit a website. They let
          the site remember information between requests — like keeping you signed in or
          remembering a preference — instead of asking you to re-enter it on every page.
        </p>
      </LegalSection>

      <LegalSection title="2. Cookies We Use">
        <p>Celaris keeps this to the minimum needed to run the Service. We use:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-slate-800 dark:text-slate-200">Authentication / session cookies</span>{" "}
            — set by Supabase Auth when you sign in, these keep you logged in and identify your
            session securely as you move between pages. Without these, you&apos;d be signed out on
            every navigation.
          </li>
          <li>
            <span className="font-medium text-slate-800 dark:text-slate-200">Preference storage</span> — your theme
            (light/dark) and accent color choice are saved in your browser so the app looks the
            way you left it on your next visit.
          </li>
          <li>
            <span className="font-medium text-slate-800 dark:text-slate-200">Security / anti-abuse</span> — hCaptcha,
            used on account signup, sets its own cookies to distinguish real users from automated
            bots. We don&apos;t control what hCaptcha stores; see their own policy for details.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. What We Don't Use">
        <p>
          Celaris does not use third-party advertising cookies, and we do not run cross-site
          tracking or ad-retargeting pixels. We don&apos;t sell or share cookie data with
          advertisers.
        </p>
      </LegalSection>

      <LegalSection title="4. Essential vs. Optional">
        <p>
          Authentication cookies are essential — the Service can&apos;t function without them,
          since there&apos;s no way to keep you signed in otherwise. Preference cookies are not
          strictly required; if you clear or block them, Celaris will just fall back to default
          appearance settings rather than your saved ones.
        </p>
      </LegalSection>

      <LegalSection title="5. Managing Cookies">
        <p>
          Most browsers let you view, delete, or block cookies through their settings. Blocking
          essential cookies will prevent you from staying signed in to Celaris. Since we don&apos;t
          use advertising or tracking cookies, there&apos;s no separate marketing opt-out to
          configure.
        </p>
      </LegalSection>

      <LegalSection title="6. Changes to This Policy">
        <p>
          We may update this Cookie Policy if the cookies we use change. We&apos;ll update the
          &quot;Last updated&quot; date above whenever we do.
        </p>
      </LegalSection>

      <LegalSection title="7. Contact">
        <p>
          Questions about this Cookie Policy can be sent to{" "}
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
