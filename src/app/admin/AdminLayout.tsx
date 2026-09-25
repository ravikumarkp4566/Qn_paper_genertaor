import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { Activity, Building2, LayoutDashboard, LogOut, ShieldCheck, Users, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
    else if (user.role !== "platform_admin") navigate("/", { replace: true });
  }, [navigate, user]);

  if (!user || user.role !== "platform_admin") return null;

  const navItems = [
    { path: "/platform-admin", label: "Overview", icon: LayoutDashboard },
    { path: "/platform-admin/workspaces", label: "Workspaces", icon: Building2 },
    { path: "/platform-admin/users", label: "Users & access", icon: Users },
    { path: "/platform-admin/audit-log", label: "Audit log", icon: Activity },
    { path: "/platform-admin/assessment-settings", label: "Assessment fields", icon: ShieldCheck },
    { path: "/platform-admin/generate", label: "Generate paper", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-foreground md:flex">
      <aside className="hidden w-72 flex-col border-r border-slate-200 bg-[#111827] text-white md:flex">
        <div className="border-b border-white/10 px-7 py-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold tracking-tight">QPGen Control</p>
              <p className="text-xs text-slate-400">Platform administration</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">
          <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Manage platform</p>
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                location.pathname === path ? "bg-violet-500/15 text-violet-200" : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="mb-4 px-3">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="mt-1 text-xs text-slate-500">{user.email}</p>
          </div>
          <button onClick={() => { signOut(); navigate("/login"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="border-b border-slate-200 bg-white px-5 py-4 md:px-10">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-600">Platform admin</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">Operations overview</h1>
            </div>
            <Link to="/" className="text-sm font-medium text-slate-500 hover:text-violet-600">Back to faculty app</Link>
          </div>
        </div>
        <div className="mx-auto max-w-7xl p-5 md:p-10"><Outlet /></div>
      </main>
    </div>
  );
}
