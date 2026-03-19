import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type AppRole = "admin" | "manager" | "coordinator" | "analyst";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Tables<"profiles"> | null;
  role: AppRole | null;
  /** True while session OR profile/role are still loading */
  loading: boolean;
  /** True only when profile+role fetch failed (user is authenticated but identity incomplete) */
  profileError: boolean;
  /** True when profile+role are successfully loaded */
  identityReady: boolean;
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
  identityReady: false,
  retryProfile: () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const FETCH_TIMEOUT = 20000;

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
  const [identityReady, setIdentityReady] = useState(false);
  const fetchingRef = useRef(false);

  const fetchUserData = useCallback(async (userId: string, maxRetries = 2): Promise<boolean> => {
    // Deduplicate concurrent calls
    if (fetchingRef.current) return identityReady;
    fetchingRef.current = true;

    // Don't reset identityReady if already loaded (silent refresh)
    if (!identityReady) {
      setProfileError(false);
    }

    try {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const [profileRes, roleRes] = await withTimeout(
            Promise.all([
              supabase.from("profiles").select("*").eq("id", userId).single(),
              supabase.from("user_roles").select("role").eq("user_id", userId).single(),
            ]),
            FETCH_TIMEOUT
          );

          const profileOk = !profileRes.error && profileRes.data;
          const roleOk = !roleRes.error && roleRes.data;

          if (profileOk) setProfile(profileRes.data);
          if (roleOk) {
            const dbRole = roleRes.data!.role;
            const mappedRole = dbRole === "employee" ? "analyst" : dbRole;
            setRole(mappedRole as AppRole);
          }

          if (!profileOk || !roleOk) {
            console.error("Failed to load identity (attempt " + (attempt + 1) + "):", profileRes.error, roleRes.error);
            if (attempt < maxRetries) {
              await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
              continue;
            }
            setProfileError(true);
            setIdentityReady(false);
            fetchingRef.current = false;
            return false;
          }

          setIdentityReady(true);
          setProfileError(false);
          fetchingRef.current = false;
          return true;
        } catch (err) {
          console.error("Auth data fetch failed (attempt " + (attempt + 1) + "):", err);
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
            continue;
          }
          setProfileError(true);
          setIdentityReady(false);
          fetchingRef.current = false;
          return false;
        }
      }
    } finally {
      fetchingRef.current = false;
    }
    return false;
  }, [identityReady]);

  const retryProfile = useCallback(() => {
    if (user) {
      setLoading(true);
      fetchUserData(user.id).finally(() => setLoading(false));
    }
  }, [user, fetchUserData]);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          fetchUserData(newSession.user.id).then(() => {
            if (mounted) setLoading(false);
          });
        } else {
          setProfile(null);
          setRole(null);
          setIdentityReady(false);
          setProfileError(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: initSession } }) => {
      if (!mounted) return;
      setSession(initSession);
      setUser(initSession?.user ?? null);
      if (initSession?.user) {
        await fetchUserData(initSession.user.id);
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
    setIdentityReady(false);
    setProfileError(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, profileError, identityReady, retryProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
