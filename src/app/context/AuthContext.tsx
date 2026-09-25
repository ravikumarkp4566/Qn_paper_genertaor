import { createContext, useContext, useMemo, useState } from "react";

export type UserRole = "faculty" | "platform_admin";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization: string;
};

type Session = {
  user: AuthUser;
  expiresAt: number;
};

type AuthContextValue = {
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => void;
};

const SESSION_KEY = "qpgen_session";
const SESSION_LENGTH_MS = 8 * 60 * 60 * 1000;

const demoUsers = [
  {
    email: "faculty@qpgen.io",
    password: "Faculty@123",
    user: {
      id: "usr_faculty_01",
      name: "Dr. Ananya Rao",
      email: "faculty@qpgen.io",
      role: "faculty" as const,
      organization: "Northstar University",
    },
  },
  {
    email: "admin@qpgen.io",
    password: "Admin@123",
    user: {
      id: "usr_admin_01",
      name: "Platform Administrator",
      email: "admin@qpgen.io",
      role: "platform_admin" as const,
      organization: "QPGen Platform",
    },
  },
];

const readSession = (): Session | null => {
  const rawSession = localStorage.getItem(SESSION_KEY);
  if (!rawSession) return null;

  try {
    const session = JSON.parse(rawSession) as Session;
    if (!session.user || session.expiresAt <= Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readSession());

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      signIn: async (email, password) => {
        const matchingUser = demoUsers.find(
          (candidate) =>
            candidate.email.toLowerCase() === email.trim().toLowerCase() &&
            candidate.password === password,
        );

        if (!matchingUser) {
          return "The email or password is incorrect. Please try again.";
        }

        const nextSession = {
          user: matchingUser.user,
          expiresAt: Date.now() + SESSION_LENGTH_MS,
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
        setSession(nextSession);
        return null;
      },
      signOut: () => {
        localStorage.removeItem(SESSION_KEY);
        setSession(null);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
