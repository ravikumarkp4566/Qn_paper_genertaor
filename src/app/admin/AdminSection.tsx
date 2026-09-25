import { useLocation } from "react-router";
import { ArrowUpRight, Search } from "lucide-react";
import { useState } from "react";
import {
  AssessmentPolicy,
  getAssessmentPolicies,
  saveAssessmentPolicies,
} from "../services/assessmentPolicy";

const content = {
  "/platform-admin/workspaces": {
    title: "Workspaces",
    description: "Review tenant plans, usage, and workspace health.",
    rows: ["Northstar University", "Apex Institute of Technology", "Greenfield College"],
  },
  "/platform-admin/users": {
    title: "Users & access",
    description: "Manage platform access and review role assignments.",
    rows: ["Dr. Ananya Rao · Faculty", "Kiran Shah · Workspace admin", "Meera Nair · Faculty"],
  },
  "/platform-admin/audit-log": {
    title: "Audit log",
    description: "A traceable record of security and platform events.",
    rows: ["Workspace policy updated · 8 minutes ago", "New admin session · 34 minutes ago", "Role changed · Yesterday"],
  },
} as const;

export function AdminSection() {
  const location = useLocation();
  const [policies, setPolicies] = useState<AssessmentPolicy[]>(getAssessmentPolicies);
  const section = content[location.pathname as keyof typeof content] ?? content["/platform-admin/workspaces"];

  if (location.pathname === "/platform-admin/assessment-settings") {
    const updatePolicy = (kind: AssessmentPolicy["kind"], field: keyof AssessmentPolicy, value: unknown) => {
      setPolicies((current) => current.map((policy) => {
        if (policy.kind !== kind) return policy;
        const next = { ...policy, [field]: value };
        saveAssessmentPolicies(current.map((item) => item.kind === kind ? next : item));
        return next;
      }));
    };

    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Assessment fields</h2>
          <p className="mt-2 text-sm text-slate-500">Administrators control every assessment field and rule shown to faculty.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {policies.map((policy) => (
            <div key={policy.kind} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-start justify-between">
                <div><h3 className="font-semibold">{policy.label}</h3><p className="mt-1 text-xs text-slate-500">{policy.kind}</p></div>
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">{policy.questionType.toUpperCase()}</span>
              </div>
              <div className="space-y-4">
                <label className="block text-sm">Total marks<input type="number" min={1} value={policy.totalMarks} onChange={(e) => updatePolicy(policy.kind, "totalMarks", Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
                <label className="block text-sm">Duration (minutes)<input type="number" min={1} value={policy.duration} onChange={(e) => updatePolicy(policy.kind, "duration", Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={policy.hasChoice} onChange={(e) => updatePolicy(policy.kind, "hasChoice", e.target.checked)} /> Allow question choice</label>
                <p className="text-xs text-slate-500">Allowed marks: {policy.allowedQuestionMarks.join(", ")}. Faculty can only use these values.</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div><h2 className="text-3xl font-semibold tracking-tight">{section.title}</h2><p className="mt-2 text-sm text-slate-500">{section.description}</p></div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-400" placeholder={`Search ${section.title.toLowerCase()}`} /></div>
          <button className="flex items-center justify-center gap-1 text-sm font-medium text-violet-600">Export report <ArrowUpRight className="h-4 w-4" /></button>
        </div>
        <div className="divide-y divide-slate-100">{section.rows.map((row) => <div key={row} className="flex items-center justify-between px-5 py-5 text-sm"><span>{row}</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Active</span></div>)}</div>
      </div>
    </div>
  );
}
