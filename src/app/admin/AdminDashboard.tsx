import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Loader2, Users } from "lucide-react";
import { getPlatformOverview, type PlatformOverview } from "../services/adminService";

export function AdminDashboard() {
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlatformOverview()
      .then(setOverview)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load the overview."));
  }, []);

  // Counted from the database, not sample figures.
  const metrics = overview
    ? [
        { label: "Colleges", value: overview.totals.colleges, tone: "bg-sky-500" },
        { label: "Users", value: overview.totals.users, tone: "bg-violet-500" },
        { label: "Papers created", value: overview.totals.papers, tone: "bg-emerald-500" },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-slate-500">Good morning, admin</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">Keep the platform healthy.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Monitor workspace activity, access health, and service signals from one secure control plane.</p>
      </div>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {!overview && !error && (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading figures from the database…
        </p>
      )}

      {overview && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className={`mb-6 h-2 w-10 rounded-full ${metric.tone}`} />
                <p className="text-sm text-slate-500">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{metric.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h3 className="font-semibold">Workspace health</h3>
              <p className="mt-1 text-sm text-slate-500">Every college on the platform</p>
            </div>
            <div className="divide-y divide-slate-100">
              {overview.tenants.map((tenant) => (
                <div key={tenant.id} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-600">
                      {tenant.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {tenant.plan} plan · {tenant.users} {tenant.users === 1 ? "member" : "members"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-7 text-sm">
                    <span className="text-slate-500">
                      <Users className="mr-1 inline h-4 w-4" />
                      {tenant.papers.toLocaleString()} papers
                    </span>
                    <span className={tenant.status === "Healthy" ? "text-emerald-600" : "text-amber-600"}>
                      {tenant.status === "Healthy" ? <CheckCircle2 className="mr-1 inline h-4 w-4" /> : <CircleAlert className="mr-1 inline h-4 w-4" />}
                      {tenant.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
