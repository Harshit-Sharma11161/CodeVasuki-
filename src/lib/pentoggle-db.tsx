"use client";

import { createContext, useContext, useCallback, type ReactNode } from "react";

// ============================================================
// TYPES
// ============================================================

export type ReadAction =
  | "findMany"
  | "findUnique"
  | "findFirst"
  | "count"
  | "aggregate"
  | "groupBy";

export interface ReadQuery {
  model: string;
  action: ReadAction;
  args?: Record<string, unknown>;
}

export interface QueryResult<T = unknown> {
  data: T;
  meta?: { count?: number };
}

interface DbContextType {
  query: <T = unknown>(model: string, action: ReadAction, args?: Record<string, unknown>) => Promise<QueryResult<T>>;
  batch: <T = unknown>(queries: ReadQuery[]) => Promise<QueryResult<T>[]>;
}

// ============================================================
// CONSTANTS
// ============================================================

// BaaS calls go to the app's own origin. The deployment proxy (for custom
// domains) or the main server's local route handlers (for pentoggle
// subdomains) forward them to the platform in-process, avoiding a cross-origin
// hop and keeping first-party semantics for cookies and CORS.
const API_BASE = typeof window !== "undefined" ? window.location.origin : "https://pentoggle.com";
const APP_ID = import.meta.env.VITE_PENTOGGLE_APP_ID || "";

// ============================================================
// CONTEXT
// ============================================================

const DbContext = createContext<DbContextType | null>(null);

// ============================================================
// INTERNAL: shared fetch helper
// ============================================================

async function dbFetch<T>(
  body: unknown,
  accessToken: string | null,
  onAuthRefresh: (() => Promise<string | null>) | null,
): Promise<T> {
  const send = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${APP_ID}`,
    };
    if (token) headers["X-User-Token"] = token;
    return fetch(`${API_BASE}/api/baas/db/query`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  };

  let res = await send(accessToken);

  // Silent refresh on 401: if the app wired an onAuthRefresh callback and
  // the server says the access token is dead, ask for a new one and retry
  // once. If refresh fails (returns null) the user's auth state has already
  // been cleared by the auth provider — propagate the 401.
  if (res.status === 401 && onAuthRefresh) {
    const fresh = await onAuthRefresh();
    if (fresh) res = await send(fresh);
  }

  const json = await res.json();

  if (!res.ok) {
    const msg = json?.error?.message || json?.error || "Database query failed";
    throw new Error(msg);
  }

  return json as T;
}

// ============================================================
// PROVIDER
// ============================================================

interface PentoggleDbProviderProps {
  children: ReactNode;
  /** Pass the user's access token for authenticated queries. Omit for public-only access. */
  accessToken?: string | null;
  /** Optional callback invoked once on 401 to obtain a fresh access token.
   *  Wire `useAuth().refresh` here so expired sessions are renewed silently
   *  without surfacing a 401 to UI code. Returns the new token, or null if
   *  refresh failed (in which case the original 401 propagates). */
  onAuthRefresh?: (() => Promise<string | null>) | null;
}

export function PentoggleDbProvider({ children, accessToken = null, onAuthRefresh = null }: PentoggleDbProviderProps) {

  const query = useCallback(
    async <T = unknown>(model: string, action: ReadAction, args?: Record<string, unknown>): Promise<QueryResult<T>> => {
      return dbFetch<QueryResult<T>>({ model, action, args }, accessToken, onAuthRefresh);
    },
    [accessToken, onAuthRefresh],
  );

  const batch = useCallback(
    async <T = unknown>(queries: ReadQuery[]): Promise<QueryResult<T>[]> => {
      return dbFetch<QueryResult<T>[]>({ batch: queries }, accessToken, onAuthRefresh);
    },
    [accessToken, onAuthRefresh],
  );

  return (
    <DbContext.Provider value={{ query, batch }}>
      {children}
    </DbContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================

export function useDb(): DbContextType {
  const ctx = useContext(DbContext);
  if (!ctx) {
    throw new Error("useDb must be used within <PentoggleDbProvider>");
  }
  return ctx;
}
