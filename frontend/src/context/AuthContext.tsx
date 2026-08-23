import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import api from "../api/client";

export interface PartnerInfo {
  id: number;
  name: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  partner: PartnerInfo | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchDjangoUser(token: string): Promise<User> {
    localStorage.setItem("access_token", token);
    const { data } = await api.get("/portal/me/");
    return data.user as User;
  }

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.access_token) {
        try {
          const djangoUser = await fetchDjangoUser(session.access_token);
          setUser(djangoUser);
        } catch {
          localStorage.removeItem("access_token");
        }
      }
      setLoading(false);
    });

    // Keep access_token in sync when Supabase refreshes the session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.access_token) {
          localStorage.setItem("access_token", session.access_token);
          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            try {
              const djangoUser = await fetchDjangoUser(session.access_token);
              setUser(djangoUser);
            } catch {
              // token valid in Supabase but Django call failed — leave user state as-is
            }
          }
        } else if (event === "SIGNED_OUT") {
          localStorage.removeItem("access_token");
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      throw new Error(error?.message ?? "Login failed");
    }
    const djangoUser = await fetchDjangoUser(data.session.access_token);
    setUser(djangoUser);
    return djangoUser;
  }

  async function logout() {
    await supabase.auth.signOut();
    localStorage.removeItem("access_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
