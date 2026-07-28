import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, workspace] = await Promise.all([
    supabase
      .from("users")
      .select("full_name, business_name, phone, plan, created_at")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
    getCurrentWorkspace(supabase, user?.id ?? ""),
  ]);

  const rows = [
    { label: "Full name", value: profile?.full_name || "—" },
    { label: "Email", value: user?.email || "—" },
    { label: "Phone", value: profile?.phone || "—" },
    { label: "Workspace", value: workspace?.name || "—" },
    { label: "Role", value: workspace?.role || "—" },
    { label: "Plan", value: profile?.plan || "free" },
    {
      label: "Member since",
      value: profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString()
        : "—",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your account and business details.
        </p>
      </div>

      <div className="max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <dl className="divide-y divide-slate-100">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-3 gap-4 px-6 py-4 text-sm"
            >
              <dt className="text-slate-500">{row.label}</dt>
              <dd className="col-span-2 font-medium text-slate-900">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
