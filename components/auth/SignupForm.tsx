"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { createBrowserClient } from "@supabase/ssr";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";
import { completeSignupProvisioning } from "@/lib/actions/auth";
import { clearInactivityState, writeLastActivity } from "@/lib/inactivity";
import { useTheme } from "@/hooks/useTheme";

export type SignupInvite = { token: string; email: string; workspaceName: string };

export function SignupForm({ invite }: { invite?: SignupInvite | null }) {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const router = useRouter();
  const { isDark } = useTheme();

  // hCaptcha only reads its `theme` prop at mount, so a live toggle needs a
  // remount (via `key`) to actually repaint the widget -- which also
  // invalidates whatever token was already captured, so that's cleared too.
  useEffect(() => {
    setCaptchaToken(null);
  }, [isDark]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!captchaToken) {
      setErrorMessage("Please complete the CAPTCHA verification.");
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const fullName = formData.get("fullName") as string;
    const businessName = invite ? "" : (formData.get("businessName") as string);
    // Locked to the invite's email when present -- the field is disabled so
    // it isn't even in formData, but resolving it from `invite` here rather
    // than trusting anything client-controllable is the more defensive path.
    // The real enforcement is server-side: acceptInvitation() re-checks this
    // exact email against the invite before joining the workspace.
    const email = invite ? invite.email : (formData.get("email") as string);
    const password = formData.get("password") as string;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          business_name: businessName,
        },
        captchaToken,
      },
    });

    if (error) {
      setLoading(false);
      setErrorMessage(error.message);
      return;
    }

    if (!data.session) {
      // Email confirmation required -- there's no session yet, so
      // provisioning (which reads the session) has to wait until the user
      // actually logs in; the login action backfills it then.
      setLoading(false);
      setNeedsConfirmation(true);
      return;
    }

    const result = await completeSignupProvisioning(fullName, businessName, invite?.token ?? null);
    setLoading(false);

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    clearInactivityState();
    writeLastActivity();
    router.push("/dashboard");
  };

  if (needsConfirmation) {
    return (
      <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
        Account created. Please check your email to confirm your address before logging in.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md dark:bg-red-500/10 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      <AuthInput
        id="fullName"
        name="fullName"
        type="text"
        label="Full name"
        placeholder="Your name"
        required
      />

      {!invite && (
        <AuthInput
          id="businessName"
          name="businessName"
          type="text"
          label="Business name (optional)"
          placeholder="Your company"
        />
      )}

      <AuthInput
        id="email"
        name="email"
        type="email"
        label="Email"
        placeholder="Your email"
        defaultValue={invite?.email}
        disabled={!!invite}
        required
      />

      <AuthInput
        id="password"
        name="password"
        type="password"
        label="Password"
        required
      />

      <div className="flex justify-center my-4">
        <HCaptcha
          key={isDark ? "dark" : "light"}
          sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
          theme={isDark ? "dark" : "light"}
          onVerify={(token) => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken(null)}
        />
      </div>

      <AuthButton type="submit" className="w-full" loading={loading}>
        {loading ? "Creating account..." : "Create account"}
      </AuthButton>
    </form>
  );
}