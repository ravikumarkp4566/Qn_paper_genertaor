import { ArrowUpRight, CheckCircle2, CircleAlert, Users } from "lucide-react";
import { getPlatformOverview } from "../services/adminService";

export function AdminDashboard() {
  const { metrics, tenants } = getPlatformOverview();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-slate-500">Good morning, admin</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">Keep the platform healthy.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Monitor workspace activity, access health, and service signals from one secure control plane.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`mb-6 h-2 w-10 rounded-full ${metric.tone === "blue" ? "bg-sky-500" : metric.tone === "violet" ? "bg-violet-500" : metric.tone === "green" ? "bg-emerald-500" : "bg-amber-500"}`} />
            <p className="text-sm text-slate-500">{metric.label}</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-2xl font-semibold tracking-tight">{metric.value}</p>
              <span className="text-xs font-medium text-emerald-600">{metric.trend}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div><h3 className="font-semibold">Workspace health</h3><p className="mt-1 text-sm text-slate-500">Your highest-impact customer workspaces</p></div>
          <button className="flex items-center gap-1 text-sm font-medium text-violet-600">View all <ArrowUpRight className="h-4 w-4" /></button>
        </div>
        <div className="divide-y divide-slate-100">
          {tenants.map((tenant) => (
            <div key={tenant.name} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-600">{tenant.name.slice(0, 2).toUpperCase()}</div><div><p className="font-medium">{tenant.name}</p><p className="mt-1 text-xs text-slate-500">{tenant.plan} plan · {tenant.users} members</p></div></div>
              <div className="flex items-center gap-7 text-sm"><span className="text-slate-500"><Users className="mr-1 inline h-4 w-4" />{tenant.papers.toLocaleString()} papers</span><span className={tenant.status === "Healthy" ? "text-emerald-600" : "text-amber-600"}>{tenant.status === "Healthy" ? <CheckCircle2 className="mr-1 inline h-4 w-4" /> : <CircleAlert className="mr-1 inline h-4 w-4" />}{tenant.status}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
