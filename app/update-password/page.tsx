import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";

export default function UpdatePasswordPage() {
  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose a new password for your account."
      footer={
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
          Back to sign in
        </Link>
      }
    >
      <UpdatePasswordForm />
    </AuthCard>
  );
}
