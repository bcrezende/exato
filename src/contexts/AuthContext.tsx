import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type AppRole = "admin" | "manager" | "coordinator" | "analyst";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Tables<"profiles"> | null;
  role: AppRole | null;
  loading: boolean;
  profileError: boolean;
  retryProfile: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  role: null,
  loading: true,
  profileError: false,
  retryProfile: () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const FETCH_TIMEOUT = 10000; // 10s timeout for profile/role queries

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Request timeout")), ms)),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      setProfileError(false);
      const [profileRes, roleRes] = await withTimeout(
        Promise.all([
          supabase.from("profiles").select("*").eq("id", userId).single(),
          supabase.from("user_roles").select("role").eq("user_id", userId).single(),
        ]),
        FETCH_TIMEOUT
      );
      if (profileRes.data) setProfile(profileRes.data);
      if (roleRes.data) {
        const dbRole = roleRes.data.role;
        const mappedRole = dbRole === 'employee' ? 'analyst' : dbRole;
        setRole(mappedRole as AppRole);
      }
      if (profileRes.error && roleRes.error) {
        console.error("Failed to load profile data:", profileRes.error, roleRes.error);
        setProfileError(true);
      }
    } catch (err) {
      console.error("Auth data fetch failed:", err);
      setProfileError(true);
    }
  }, []);

  const retryProfile = useCallback(() => {
    if (user) {
      setLoading(true);
      fetchUserData(user.id).finally(() => setLoading(false));
    }
  }, [user, fetchUserData]);

  useEffect(() => {
    let mounted = true;

    // Set up auth listener first (non-blocking)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Don't block the callback - fetch in background
          fetchUserData(session.user.id).then(() => {
            if (mounted) setLoading(false);
          });
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserData(session.user.id);
      }
      if (mounted) setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, profileError, retryProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
