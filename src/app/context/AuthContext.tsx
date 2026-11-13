import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { api, ApiError, getToken, setToken, SIGNED_OUT_EVENT } from "../services/api";
import { loadAll, resetCache } from "../services/dataStore";

export type UserRole = "faculty" | "platform_admin";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** The user's college, or the platform for administrators. */
  organization: string;
};

type ServerUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  college: { id: string; name: string } | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => void;
};

const toAuthUser = (user: ServerUser): AuthUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  organization: user.college?.name ?? "QPGen Platform",
});

type Status = "loading" | "ready" | "error";

/**
 * Signs in against the server and loads the user's data from the database
 * before showing the app, so every page can read it straight away.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<Status>(() => (getToken() ? "loading" : "ready"));
  const [loadError, setLoadError] = useState<string | null>(null);

  const startSession = useCallback(async (serverUser: ServerUser) => {
    await loadAll(serverUser.role);
    setUser(toAuthUser(serverUser));
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    resetCache();
    setUser(null);
  }, []);

  // Resume the session from a saved token.
  const resume = useCallback(async () => {
    if (!getToken()) {
      setStatus("ready");
      return;
    }
    setStatus("loading");
    try {
      const { user: serverUser } = await api<{ user: ServerUser }>("/auth/me");
      await startSession(serverUser);
      setStatus("ready");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        signOut();
        setStatus("ready");
        return;
      }
      setLoadError(error instanceof Error ? error.message : "Could not load your data.");
      setStatus("error");
    }
  }, [signOut, startSession]);

  useEffect(() => {
    void resume();
  }, [resume]);

  useEffect(() => {
    window.addEventListener(SIGNED_OUT_EVENT, signOut);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, signOut);
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      signIn: async (email, password) => {
        try {
          const result = await api<{ token: string; user: ServerUser }>("/auth/login", {
            method: "POST",
            body: { email: email.trim(), password },
          });
          setToken(result.token);
          await startSession(result.user);
          return null;
        } catch (error) {
          setToken(null);
          resetCache();
          return error instanceof Error ? error.message : "Could not sign in. Please try again.";
        }
      },
      signOut,
    }),
    [signOut, startSession, user],
  );

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-indigo-600" />
        Loading your workspace…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
        <p className="text-sm font-semibold text-slate-800">Could not load your workspace</p>
        <p className="max-w-md text-xs text-slate-500">{loadError}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void resume()}
            className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => {
              signOut();
              setStatus("ready");
            }}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
