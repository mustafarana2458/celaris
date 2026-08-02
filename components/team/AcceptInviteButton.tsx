"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { acceptInvitation } from "@/lib/actions/team-invites";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    const result = await acceptInvitation(token);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setAccepted(true);
    setTimeout(() => router.push("/dashboard"), 1200);
  }

  if (accepted) {
    return <p className="text-sm font-medium text-emerald-600">Joined! Redirecting to your dashboard...</p>;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button type="button" onClick={handleAccept} loading={loading} className="w-full">
        Accept invite
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
