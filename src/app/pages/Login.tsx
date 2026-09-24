import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, FileText, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, signIn } = useAuth();

  useEffect(() => {
    if (user) navigate(user.role === "platform_admin" ? "/platform-admin" : "/", { replace: true });
  }, [navigate, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    const signInError = await signIn(email, password);
    setIsSubmitting(false);
    if (signInError) setError(signInError);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8fc] p-4 md:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70 md:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden bg-[#111827] p-12 text-white md:flex md:flex-col md:justify-between">
          <div><div className="mb-10 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500"><FileText className="h-5 w-5" /></div><span className="text-xl font-semibold">QPGen</span></div><p className="max-w-sm text-4xl font-semibold leading-tight tracking-tight">Build better assessments, faster.</p><p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">A focused workspace for educators and a secure control plane for the teams operating your platform.</p></div>
          <div className="flex items-center gap-3 text-sm text-slate-400"><ShieldCheck className="h-5 w-5 text-emerald-400" /> Secure role-based access</div>
        </div>
        <div className="p-7 sm:p-10 md:p-12">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 md:hidden">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">Sign in to your QPGen workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="you@university.edu"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter your password"
                required
              />
            </div>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 font-medium text-white shadow-sm transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Signing in..." : "Sign in"} {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-7 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
            <p className="font-semibold text-slate-700">Demo access</p>
            <p className="mt-1">Faculty: faculty@qpgen.io / Faculty@123</p>
            <p className="mt-1">Platform admin: admin@qpgen.io / Admin@123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
