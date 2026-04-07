"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
};

export type LoginStepResult =
  | {
      kind: "twoFactor";
      challengeId: string;
      expiresIn: number;
      emailMasked?: string;
    }
  | { kind: "session"; user: AuthUser };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginStepResult>;
  verifyTwoFactor: (challengeId: string, code: string) => Promise<AuthUser>;
  resendTwoFactor: (
    challengeId: string,
  ) => Promise<{ expiresIn: number; retryAfterSeconds?: number }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = (await res.json()) as { user: AuthUser };
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refreshSession();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  useEffect(() => {
    const onFocus = () => {
      void refreshSession();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshSession]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      requiresTwoFactor?: boolean;
      challengeId?: string;
      expiresIn?: number;
      emailMasked?: string;
      user?: AuthUser;
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error ?? "Login failed");
    }
    if (data.requiresTwoFactor && data.challengeId) {
      return {
        kind: "twoFactor" as const,
        challengeId: data.challengeId,
        expiresIn:
          typeof data.expiresIn === "number" && data.expiresIn > 0
            ? data.expiresIn
            : 300,
        emailMasked: data.emailMasked,
      };
    }
    if (data.user) {
      setUser(data.user);
      return { kind: "session" as const, user: data.user };
    }
    throw new Error("Invalid response from server");
  }, []);

  const verifyTwoFactor = useCallback(
    async (challengeId: string, code: string) => {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ challengeId, code }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        user?: AuthUser;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Verification failed");
      }
      if (!data.user) {
        throw new Error("Invalid response from server");
      }
      setUser(data.user);
      return data.user;
    },
    [],
  );

  const resendTwoFactor = useCallback(async (challengeId: string) => {
    const res = await fetch("/api/auth/resend-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ challengeId }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      expiresIn?: number;
      error?: string;
      retryAfterSeconds?: number;
    };
    if (!res.ok) {
      const err = new Error(data.error ?? "Could not resend code") as Error & {
        retryAfterSeconds?: number;
      };
      if (typeof data.retryAfterSeconds === "number") {
        err.retryAfterSeconds = data.retryAfterSeconds;
      }
      throw err;
    }
    const expiresIn =
      typeof data.expiresIn === "number" && data.expiresIn > 0
        ? data.expiresIn
        : 300;
    return { expiresIn };
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      verifyTwoFactor,
      resendTwoFactor,
      logout,
      refreshSession,
    }),
    [
      user,
      loading,
      login,
      verifyTwoFactor,
      resendTwoFactor,
      logout,
      refreshSession,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
