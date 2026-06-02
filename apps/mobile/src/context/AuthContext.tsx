import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, clearSession, getSession, setSession } from '../api/client';

type Ctx = {
  session: Session | null;
  loading: boolean;
  signIn: (s: Session) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  session: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setS] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession().then((s) => { setS(s); setLoading(false); });
  }, []);

  const value: Ctx = {
    session,
    loading,
    signIn: async (s) => { await setSession(s); setS(s); },
    signOut: async () => { await clearSession(); setS(null); },
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
