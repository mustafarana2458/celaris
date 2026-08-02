import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { AiInsightsCard } from "@/components/dashboard/AiInsightsCard";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { DealsPipelineChart } from "@/components/dashboard/charts/DealsPipelineChart";
import { RevenueChart } from "@/components/dashboard/charts/RevenueChart";
import { LeadsVsCustomersChart } from "@/components/dashboard/charts/LeadsVsCustomersChart";
import type { DealsByStage } from "@/components/dashboard/charts/DealsPipelineChart";
import type { RevenueByMonth } from "@/components/dashboard/charts/RevenueChart";
import type { Contact, DealStage, Task } from "@/lib/types";

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function last6Months() {
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({ key: monthKey(d), label: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }) });
  }
  return months;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, plan")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const workspace = user ? await getCurrentWorkspace(supabase, user.id) : null;

  let contactsCount = 0;
  let openDealsCount = 0;
  let pipelineValue = 0;
  let activeProjectsCount = 0;
  let unpaidInvoicesCount = 0;
  let unpaidAmount = 0;
  let recentContacts: Contact[] = [];
  let upcomingTasks: Task[] = [];
  let dealsByStage: DealsByStage[] = [];
  let revenueByMonth: RevenueByMonth[] = last6Months().map((m) => ({ month: m.label, total: 0 }));
  let leadsCount = 0;
  let customersCount = 0;

  if (workspace) {
    const [
      contactsCountRes,
      openDealsRes,
      activeProjectsCountRes,
      unpaidInvoicesRes,
      recentContactsRes,
      upcomingTasksRes,
      allDealsRes,
      paidInvoicesRes,
      leadsCountRes,
      customersCountRes,
    ] = await Promise.all([
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id),
      supabase
        .from("deals")
        .select("id, value")
        .eq("workspace_id", workspace.id)
        .not("stage", "in", "(won,lost)"),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .eq("status", "active"),
      supabase
        .from("invoices")
        .select("id, total")
        .eq("workspace_id", workspace.id)
        .in("status", ["unpaid", "overdue"]),
      supabase
        .from("contacts")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("tasks")
        .select("*")
        .eq("workspace_id", workspace.id)
        .neq("status", "done")
        .not("due_date", "is", null)
        .order("due_date", { ascending: true })
        .limit(5),
      supabase.from("deals").select("stage, value").eq("workspace_id", workspace.id),
      supabase
        .from("invoices")
        .select("issued_at, total")
        .eq("workspace_id", workspace.id)
        .eq("status", "paid"),
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .eq("type", "lead"),
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .eq("type", "customer"),
    ]);

    const openDeals = openDealsRes.data ?? [];
    const unpaidInvoices = unpaidInvoicesRes.data ?? [];

    contactsCount = contactsCountRes.count ?? 0;
    openDealsCount = openDeals.length;
    pipelineValue = openDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);
    activeProjectsCount = activeProjectsCountRes.count ?? 0;
    unpaidInvoicesCount = unpaidInvoices.length;
    unpaidAmount = unpaidInvoices.reduce((sum, i) => sum + (i.total ?? 0), 0);
    recentContacts = (recentContactsRes.data as Contact[]) ?? [];
    upcomingTasks = (upcomingTasksRes.data as Task[]) ?? [];

    const stageValues = new Map<DealStage, number>();
    for (const d of (allDealsRes.data as { stage: DealStage; value: number | null }[]) ?? []) {
      stageValues.set(d.stage, (stageValues.get(d.stage) ?? 0) + (d.value ?? 0));
    }
    dealsByStage = Array.from(stageValues, ([stage, value]) => ({ stage, value }));

    const months = last6Months();
    const revenueByKey = new Map<string, number>();
    for (const inv of (paidInvoicesRes.data as { issued_at: string; total: number }[]) ?? []) {
      const key = monthKey(new Date(inv.issued_at));
      revenueByKey.set(key, (revenueByKey.get(key) ?? 0) + (inv.total ?? 0));
    }
    revenueByMonth = months.map((m) => ({ month: m.label, total: revenueByKey.get(m.key) ?? 0 }));

    leadsCount = leadsCountRes.count ?? 0;
    customersCount = customersCountRes.count ?? 0;
  }

  const statCards = [
    { label: "Contacts", value: String(contactsCount), href: "/dashboard/contacts" },
    {
      label: "Open deals",
      value: String(openDealsCount),
      sub: `${currency.format(pipelineValue)} pipeline`,
      href: "/dashboard/deals",
    },
    {
      label: "Active projects",
      value: String(activeProjectsCount),
      href: "/dashboard/projects",
    },
    {
      label: "Unpaid invoices",
      value: String(unpaidInvoicesCount),
      sub: currency.format(unpaidAmount),
      href: "/dashboard/invoices",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Home", href: "/dashboard" }, { label: "Dashboard" }]} />

      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Here&apos;s a snapshot of your business.{" "}
          <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent-hover dark:bg-accent/15 dark:text-accent">
            {profile?.plan ?? "free"} plan
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
          >
            <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{stat.value}</p>
            {stat.sub && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{stat.sub}</p>}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DealsPipelineChart data={dealsByStage} />
        </div>
        <LeadsVsCustomersChart data={{ leads: leadsCount, customers: customersCount }} />
        <div className="lg:col-span-3">
          <RevenueChart data={revenueByMonth} />
        </div>
      </div>

      <AiInsightsCard />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent contacts</h2>
            <Link
              href="/dashboard/contacts"
              className="text-xs font-medium text-accent-hover hover:underline dark:text-accent"
            >
              View all
            </Link>
          </div>
          <div className="mt-2 flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
            {recentContacts.length === 0 ? (
              <p className="py-4 text-sm text-slate-500 dark:text-slate-400">No contacts yet.</p>
            ) : (
              recentContacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{c.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {c.company || c.email || "—"}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {c.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Upcoming tasks</h2>
            <Link
              href="/dashboard/tasks"
              className="text-xs font-medium text-accent-hover hover:underline dark:text-accent"
            >
              View all
            </Link>
          </div>
          <div className="mt-2 flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
            {upcomingTasks.length === 0 ? (
              <p className="py-4 text-sm text-slate-500 dark:text-slate-400">No upcoming tasks.</p>
            ) : (
              upcomingTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Due {formatDate(t.due_date)}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {t.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
