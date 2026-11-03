import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import type { User } from './db/schema';
import { clearSession, restoreSession, signInUser } from './sessionStore';

export { hashPin } from './sessionStore';

export interface SessionContextType {
  user: User | null;
  loading: boolean;
  /** Xatolik (masalan CorruptDataError) bo'lsa shu yerda. */
  error: Error | null;
  signIn(userId: string, pin: string | null): Promise<boolean>;
  signOut(): Promise<void>;
  /** Joriy foydalanuvchini bazadan qayta o'qiydi (rol/ism o'zgargandan keyin). */
  refresh(): Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setUser(await restoreSession());
    } catch (e) {
      setError(e as Error);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    restoreSession()
      .then((u) => alive && setUser(u))
      .catch((e) => alive && setError(e as Error))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const signIn = useCallback(async (userId: string, pin: string | null) => {
    const u = await signInUser(userId, pin);
    if (!u) return false;
    setUser(u);
    return true;
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, error, signIn, signOut, refresh }),
    [user, loading, error, signIn, signOut, refresh],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextType {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
