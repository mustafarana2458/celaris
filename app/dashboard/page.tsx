import Link from "next/link";
import { Users, Briefcase, FolderKanban, Receipt, ArrowUp, ArrowDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { hasModuleAccess } from "@/lib/permissions";
import { AiInsightsCard } from "@/components/dashboard/AiInsightsCard";
import { ContactRowMenu } from "@/components/dashboard/ContactRowMenu";
import { DealsPipelineChart } from "@/components/dashboard/charts/DealsPipelineChart";
import { RevenueChart } from "@/components/dashboard/charts/RevenueChart";
import { LeadsVsCustomersChart } from "@/components/dashboard/charts/LeadsVsCustomersChart";
import { tagColor } from "@/lib/tagColors";
import { getInitials } from "@/lib/avatar";
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

// Approximates a "vs last month" trend from record creation dates, since we
// don't keep historical snapshots: records created in the last 30 days vs
// the 30 days before that. Falls back to a flat 0% when there's no data to
// compare rather than showing a misleading number.
function trendFromDates(dates: string[]) {
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const periodStart = now - 30 * day;
  const prevStart = now - 60 * day;
  let current = 0;
  let previous = 0;
  for (const value of dates) {
    const t = new Date(value).getTime();
    if (t >= periodStart) current++;
    else if (t >= prevStart) previous++;
  }
  if (previous === 0) return { pct: current > 0 ? 100 : 0, up: true };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct: Math.abs(pct), up: pct >= 0 };
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

  // Guarded inline instead of via requireModuleAccess() -- that helper
  // redirects to /dashboard, which would loop forever on this exact page.
  if (workspace && !hasModuleAccess(workspace.role, workspace.permissions, "dashboard")) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Access denied</p>
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
          You don&apos;t have access to this page. Contact your workspace owner if you think this
          is a mistake.
        </p>
      </div>
    );
  }

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
  let contactsTrend = { pct: 0, up: true };
  let dealsTrend = { pct: 0, up: true };
  let projectsTrend = { pct: 0, up: true };
  let invoicesTrend = { pct: 0, up: true };

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
        .select("id, created_at")
        .eq("workspace_id", workspace.id),
      supabase
        .from("deals")
        .select("id, value, created_at")
        .eq("workspace_id", workspace.id)
        .not("stage", "in", "(won,lost)"),
      supabase
        .from("projects")
        .select("id, created_at")
        .eq("workspace_id", workspace.id)
        .eq("status", "active"),
      supabase
        .from("invoices")
        .select("id, total, issued_at")
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

    const contactsRows = contactsCountRes.data ?? [];
    const openDeals = openDealsRes.data ?? [];
    const activeProjectsRows = activeProjectsCountRes.data ?? [];
    const unpaidInvoices = unpaidInvoicesRes.data ?? [];

    contactsCount = contactsRows.length;
    openDealsCount = openDeals.length;
    pipelineValue = openDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);
    activeProjectsCount = activeProjectsRows.length;
    unpaidInvoicesCount = unpaidInvoices.length;
    unpaidAmount = unpaidInvoices.reduce((sum, i) => sum + (i.total ?? 0), 0);
    recentContacts = (recentContactsRes.data as Contact[]) ?? [];
    upcomingTasks = (upcomingTasksRes.data as Task[]) ?? [];

    contactsTrend = trendFromDates(contactsRows.map((r) => r.created_at));
    dealsTrend = trendFromDates(openDeals.map((d) => d.created_at));
    projectsTrend = trendFromDates(activeProjectsRows.map((r) => r.created_at));
    invoicesTrend = trendFromDates(unpaidInvoices.map((i) => i.issued_at));

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
    {
      label: "Contacts",
      value: String(contactsCount),
      href: "/dashboard/contacts",
      icon: Users,
      iconBg: "bg-blue-50 dark:bg-blue-950/40",
      iconColor: "text-blue-600 dark:text-blue-400",
      trend: contactsTrend,
    },
    {
      label: "Open deals",
      value: String(openDealsCount),
      sub: `${currency.format(pipelineValue)} pipeline`,
      href: "/dashboard/deals",
      icon: Briefcase,
      iconBg: "bg-purple-50 dark:bg-purple-950/40",
      iconColor: "text-purple-600 dark:text-purple-400",
      trend: dealsTrend,
    },
    {
      label: "Active projects",
      value: String(activeProjectsCount),
      href: "/dashboard/projects",
      icon: FolderKanban,
      iconBg: "bg-green-50 dark:bg-green-950/40",
      iconColor: "text-green-600 dark:text-green-400",
      trend: projectsTrend,
    },
    {
      label: "Unpaid invoices",
      value: String(unpaidInvoicesCount),
      sub: currency.format(unpaidAmount),
      href: "/dashboard/invoices",
      icon: Receipt,
      iconBg: "bg-orange-50 dark:bg-orange-950/40",
      iconColor: "text-orange-600 dark:text-orange-400",
      trend: invoicesTrend,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
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
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
          >
            <div className="flex items-center gap-3">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${stat.iconBg}`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </span>
              <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</p>
            {stat.sub && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{stat.sub}</p>}
            <p
              className={`mt-2 flex items-center gap-1 text-xs font-medium ${
                stat.trend.up ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {stat.trend.up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {stat.trend.up ? "+" : "-"}
              {stat.trend.pct}% from last month
            </p>
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
                <div key={c.id} className="flex items-center gap-3 py-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${tagColor(c.name).dot}`}
                  >
                    {getInitials(c.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{c.name}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {c.company || c.email || "—"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {c.type}
                  </span>
                  <ContactRowMenu name={c.name} />
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
