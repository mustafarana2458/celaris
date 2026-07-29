"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function SignupForm() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

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
    const businessName = formData.get("businessName") as string;
    const email = formData.get("email") as string;
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

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      console.log("Signup successful:", data);
      router.push("/dashboard");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
          {errorMessage}
        </div>
      )}

      <Input
        id="fullName"
        name="fullName"
        type="text"
        label="Full name"
        placeholder="Rana Muhammad Bilal"
        required
      />

      <Input
        id="businessName"
        name="businessName"
        type="text"
        label="Business name"
        placeholder="Celaris Inc"
        required
      />

      <Input
        id="email"
        name="email"
        type="email"
        label="Email"
        placeholder="bilal@celaris.cloud"
        required
      />

      <Input
        id="password"
        name="password"
        type="password"
        label="Password"
        required
      />

      <div className="flex justify-center my-4">
        <HCaptcha
          sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
          onVerify={(token) => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken(null)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}