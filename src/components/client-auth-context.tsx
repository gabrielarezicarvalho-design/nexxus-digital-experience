import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { watchClientIdentity } from '@/lib/client-auth-readiness';
import { useRouter } from '@tanstack/react-router';

const ClientIdentity = createContext<{ user: User | null; ready: boolean; error: boolean; retry: () => void }>({ user: null, ready: false, error: false, retry: () => {} });
export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const queryClient = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    let active = true;
    setError(false);
    const stop = watchClientIdentity<User>(publish => {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (!active) return;
        // Session identity controls presentation only; server functions still verify access.
        publish(session?.user ?? null);
        if (event === 'SIGNED_OUT') {
          queryClient.removeQueries({ queryKey: ['client-dashboard'] });
          queryClient.removeQueries({ queryKey: ['is-admin'] });
          queryClient.removeQueries({ queryKey: ['admin-access'] });
        } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
          // Never perform auth-dependent work inside the SDK's locked callback.
          setTimeout(() => { if (active) void queryClient.invalidateQueries({ queryKey: ['client-dashboard'] }); }, 0);
        }
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          setTimeout(() => {
            if (!active) return;
            void router.invalidate();
            if (event !== 'SIGNED_OUT') void queryClient.invalidateQueries({ queryKey: ['is-admin'] });
          }, 0);
        }
      });
      return () => data.subscription.unsubscribe();
    }, identity => { setUser(identity); setReady(true); setError(false); }, () => setError(true));
    return () => { active = false; stop(); };
  }, [queryClient, router, attempt]);
  return <ClientIdentity.Provider value={{ user, ready, error, retry: () => setAttempt(value => value + 1) }}>{children}</ClientIdentity.Provider>;
}
export function useClientIdentity() { return useContext(ClientIdentity); }