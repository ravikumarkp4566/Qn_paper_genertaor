import { Outlet, Link, useLocation, useNavigate } from "react-router";
import {
  FileText,
  Clock,
  LayoutDashboard,
  BookOpen,
  Database,
  Sparkles,
  Sigma,
  GraduationCap,
  LogOut,
} from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
    else if (user.role === "platform_admin") navigate("/platform-admin", { replace: true });
  }, [navigate, user]);

  if (!user || user.role === "platform_admin") return null;

  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/subjects", icon: BookOpen, label: "Subjects" },
    { path: "/question-bank", icon: Database, label: "Question Bank" },
    { path: "/generate", icon: Sparkles, label: "Generate Paper" },
    { path: "/latex-paper", icon: Sigma, label: "LaTeX Paper" },
    { path: "/history", icon: Clock, label: "History" },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/" || location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-slate-50 flex-col md:flex-row text-slate-800">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-slate-900 text-white z-50 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-none">QPGen</h1>
            <span className="text-[11px] text-slate-400">Faculty Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <GraduationCap className="w-4 h-4 text-indigo-400" />
          <span>{user.name}</span>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-slate-900 text-white border-r border-slate-800">
        <div className="p-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">QPGen</h1>
              <p className="text-xs text-slate-400">Faculty Workspace</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Navigation
        </div>

        <nav className="flex-1 space-y-1.5 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-semibold text-sm border border-indigo-500/30">
              FA
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            </div>
            <button
              type="button"
              title="Sign out"
              onClick={() => { signOut(); navigate("/login", { replace: true }); }}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 py-2.5 px-2 flex-1 text-center ${
                  active ? "text-indigo-600 font-medium" : "text-slate-500"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
