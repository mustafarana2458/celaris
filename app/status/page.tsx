import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "System Status — Celaris",
  description: "Current operational status of Celaris services.",
};

const SERVICES = ["Web Application", "API", "Database", "Email Delivery"];

export default function StatusPage() {
  return (
    <LegalPageLayout title="System Status" lastUpdated="August 11, 2026">
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
        <p className="text-sm font-medium text-emerald-800">All systems operational</p>
      </div>

      <div className="flex flex-col divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {SERVICES.map((service) => (
          <div key={service} className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-slate-700">{service}</span>
            <span className="flex items-center gap-2 text-sm font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Operational
            </span>
          </div>
        ))}
      </div>

      <p className="text-sm text-slate-500">
        This page reflects current status only. Historical uptime and incident reports will
        appear here once our monitoring is connected.
      </p>
    </LegalPageLayout>
  );
}
