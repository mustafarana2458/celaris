import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to reset your password."
      footer={
        <>
          Remembered your password?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            Sign in
          </Link>
        </>
      }
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
