import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssistantPageClient } from "@/components/assistant/AssistantPageClient";

export default async function AssistantPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <AssistantPageClient />;
}
