"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";

// ============================================================
// TYPES
// ============================================================

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerified: boolean;
  universityId: string | null;
  rating: number;
  problemsSolved: number;
  battlesPlayed: number;
  battlesWon: number;
  contestPoints: number;
  currentStreak: number;
  lastActiveDay: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface SignUpResult {
  requiresVerification?: boolean;
}

/** Typed error thrown by auth methods. `status` is the HTTP status from the
 *  BaaS endpoint (e.g. 401 for expired session, 403 for unverified email).
 *  Apps can branch on this to render the right UX. */
export class AuthError extends Error {
  constructor(message: string, public readonly status: number = 0) {
    super(message);
    this.name = "AuthError";
  }
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signUp: (data: Record<string, unknown>) => Promise<SignUpResult>;
  signIn: (data: Record<string, unknown>) => Promise<void>;
  signInWithGoogle: () => void;
  signInWithLinkedin: () => void;
  signInWithZoho: () => void;
  signOut: () => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  /** Force a refresh-token exchange. Returns the fresh access token on success,
   *  or null if the refresh was rejected (in which case the user+token state
   *  has been cleared). Single-flight: concurrent callers share one in-flight
   *  request. Used by the BaaS SDKs to silently re-auth on 401. */
  refresh: () => Promise<string | null>;
  /** Current access token — use this to make authenticated BaaS API calls */
  accessToken: string | null;
}

// ============================================================
// CONSTANTS
// ============================================================

// BaaS calls go to the app's own origin. The deployment proxy (for custom
// domains) or the main server's local route handlers (for pentoggle
// subdomains) forward them to the platform, so the refresh cookie is set
// first-party and survives third-party cookie blocking in modern browsers.
const API_BASE = typeof window !== "undefined" ? window.location.origin : "https://pentoggle.com";
// Google Identity Services must run on a Google-authorized origin. The
// platform owns one such origin (pentoggle.com) and hosts the GIS shim at
// /baas/google-signin, so signInWithGoogle navigates there cross-origin
// instead of embedding GIS per-app (which would require registering every
// customer subdomain + custom domain with Google Cloud).
const PENTOGGLE_BASE = import.meta.env.VITE_PENTOGGLE_API_URL || "https://pentoggle.com";
const APP_ID = import.meta.env.VITE_PENTOGGLE_APP_ID || "";

// localStorage key used to broadcast auth state changes between tabs of the
// same app. Any tab that signs in or signs out writes Date.now() here, and
// every other tab's storage listener picks it up and re-hydrates from the
// refresh cookie.
const CROSS_TAB_KEY = `pentoggle:auth:tick:${APP_ID}`;
function broadcastAuthChange() {
  try { window.localStorage.setItem(CROSS_TAB_KEY, String(Date.now())); } catch { /* ignore — private mode, etc. */ }
}

// Sized to match the OAuth SDK; provider login UIs render comfortably here.
const POPUP_FEATURES = "width=600,height=720,menubar=no,toolbar=no,location=yes,resizable=yes,scrollbars=yes";

const PLATFORM_HOST = (() => {
  try { return new URL(PENTOGGLE_BASE).hostname; } catch { return "pentoggle.com"; }
})();

// The platform stamps the environment explicitly when the app can't infer it from its own
// hostname — notably a hot-reload dev session, which serves the app from a pool host
// (`*.fly.dev`) that carries no `--staging` marker. When set, it wins over host detection.
const ENV_OVERRIDE = import.meta.env.VITE_PENTOGGLE_ENVIRONMENT;

// Resolve staging vs production so the GIS/OAuth pages look up the app in the right env and
// redirect back correctly. Mirrors the server-side extractEnvironment(): explicit override
// first, else the `--staging.${PLATFORM_HOST}` host suffix.
function detectEnvironment(): "staging" | "production" {
  if (ENV_OVERRIDE === "staging" || ENV_OVERRIDE === "production") return ENV_OVERRIDE;
  if (typeof window === "undefined") return "production";
  return window.location.hostname.endsWith(`--staging.${PLATFORM_HOST}`) ? "staging" : "production";
}

// Popup-in-iframe sign-in is restricted to staging during rollout. Production apps keep the
// historical redirect behavior even when framed and are unaffected.
function shouldUsePopupFlow(): boolean {
  if (typeof window === "undefined") return false;
  if (detectEnvironment() !== "staging") return false;
  // Cross-origin parent throws on `window.top` access in some browsers; treat
  // any failure as "framed" — we'd rather use the popup path than risk a
  // redirect blocked by the iframe-targeting provider authorize page.
  try { return window.top !== window.self; } catch { return true; }
}

// ============================================================
// CONTEXT
// ============================================================

const AuthContext = createContext<AuthContextType | null>(null);

// ============================================================
// PROVIDER
// ============================================================

export function PentoggleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Single-flight refresh promise. When BaaS SDKs hit 401 concurrently we
  // want them to share one /refresh call, not stampede the server.
  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);

  const refresh = useCallback(async (): Promise<string | null> => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }
    const p = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/baas/auth/refresh`, {
          method: "POST",
          headers: { Authorization: `Bearer ${APP_ID}` },
          credentials: "include",
        });
        if (!res.ok) {
          // Server has rejected the session (expired, revoked, gone). Clear
          // local state so the next render re-routes to /login.
          setUser(null);
          setAccessToken(null);
          return null;
        }
        const data = await res.json();
        if (data) {
          setUser(data.user);
          setAccessToken(data.accessToken);
          return data.accessToken as string;
        }
        return null;
      } catch {
        // Network errors leave existing state untouched — the caller can
        // retry. We don't clear here because a transient blip shouldn't
        // sign the user out.
        return null;
      } finally {
        refreshInFlightRef.current = null;
      }
    })();
    refreshInFlightRef.current = p;
    return p;
  }, []);

  const buildHeaders = useCallback(
    (includeUserToken = true): Record<string, string> => {
      const h: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${APP_ID}`,
      };
      if (includeUserToken && accessToken) {
        h["X-User-Token"] = accessToken;
      }
      return h;
    },
    [accessToken],
  );

  // Exchanges a one-time token for a real session. Used by both the on-mount
  // URL-fragment redeem (standalone redirect flow) and the postMessage listener
  // (popup flow inside the builder preview iframe).
  const redeemExchangeToken = useCallback(async (exchangeToken: string): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/api/baas/auth/exchange`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${APP_ID}`,
        },
        credentials: "include",
        body: JSON.stringify({ exchangeToken }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data) {
        setUser(data.user);
        setAccessToken(data.accessToken);
        broadcastAuthChange();
      }
    } catch {
      // Network errors leave the user signed out; they can retry.
    }
  }, []);

  // On mount: redeem any exchange token from an OAuth redirect, otherwise
  // silent-refresh via the httpOnly cookie.
  useEffect(() => {
    const hash = window.location.hash;

    if (hash.includes("auth_exchange=")) {
      const params = new URLSearchParams(hash.substring(1));
      const exchangeToken = params.get("auth_exchange");
      if (exchangeToken) {
        // Clear hash immediately so the short-lived token isn't left in the URL
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        void redeemExchangeToken(exchangeToken).finally(() => setLoading(false));
        return;
      }
    }

    // Clear any auth error from URL query (from failed Google OAuth)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("auth_error")) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    // Normal flow: attempt silent refresh via httpOnly cookie. refresh()
    // owns the success/failure state transitions so we just await it here.
    void refresh().finally(() => setLoading(false));
  }, [redeemExchangeToken, refresh]);

  // Cross-tab auth sync: when any other tab signs in or out it bumps the
  // CROSS_TAB_KEY in localStorage. We re-hydrate from the refresh cookie so
  // every tab converges. Same-tab writes do NOT fire storage events, so
  // there's no echo here.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== CROSS_TAB_KEY) return;
      void refresh();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  // Listen for sign-in completion from a popup OAuth flow. The callback page
  // is served from PENTOGGLE_BASE so we ignore messages from any other origin
  // (prevents a malicious frame from forging a fake sign-in).
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== PENTOGGLE_BASE) return;
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "oauth-signin-success" && typeof e.data.exchangeToken === "string") {
        void redeemExchangeToken(e.data.exchangeToken);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [redeemExchangeToken]);

  const signUp = useCallback(
    async (data: Record<string, unknown>): Promise<SignUpResult> => {
      const res = await fetch(`${API_BASE}/api/baas/auth/signup`, {
        method: "POST",
        headers: buildHeaders(false),
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new AuthError(err.error || "Sign up failed", res.status);
      }
      const result = await res.json();
      if (result.requiresVerification) {
        return { requiresVerification: true };
      }
      setUser(result.user);
      setAccessToken(result.accessToken);
      broadcastAuthChange();
      return {};
    },
    [buildHeaders],
  );

  const signIn = useCallback(
    async (data: Record<string, unknown>): Promise<void> => {
      const res = await fetch(`${API_BASE}/api/baas/auth/login`, {
        method: "POST",
        headers: buildHeaders(false),
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new AuthError(err.error || "Sign in failed", res.status);
      }
      const { user: u, accessToken: t } = await res.json();
      setUser(u);
      setAccessToken(t);
      broadcastAuthChange();
    },
    [buildHeaders],
  );

  const signInWithGoogle = useCallback(() => {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    const environment = detectEnvironment();
    // Inside an iframe (e.g. the builder preview), provider authorize pages
    // refuse to render via X-Frame-Options. Open the GIS shim in a popup; it
    // detects flow=popup and postMessages an exchange token back here.
    if (shouldUsePopupFlow()) {
      const url = `${PENTOGGLE_BASE}/baas/google-signin?appId=${APP_ID}&returnTo=${returnTo}&environment=${environment}&flow=popup`;
      window.open(url, "oauth-signin-google", POPUP_FEATURES);
      return;
    }
    window.location.href = `${PENTOGGLE_BASE}/baas/google-signin?appId=${APP_ID}&returnTo=${returnTo}&environment=${environment}`;
  }, []);

  // LinkedIn doesn't need a platform-hosted GIS shim — the OAuth flow is
  // pure server redirect, so we navigate straight to the unified BaaS OAuth
  // start route with mode=signin. The callback handles user creation and
  // bounces the browser back here with auth_exchange in the URL fragment.
  const signInWithLinkedin = useCallback(() => {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    const environment = detectEnvironment();
    if (shouldUsePopupFlow()) {
      const url = `${PENTOGGLE_BASE}/api/baas/oauth/linkedin/start?mode=signin&appId=${APP_ID}&returnTo=${returnTo}&environment=${environment}&flow=popup`;
      window.open(url, "oauth-signin-linkedin", POPUP_FEATURES);
      return;
    }
    window.location.href = `${PENTOGGLE_BASE}/api/baas/oauth/linkedin/start?mode=signin&appId=${APP_ID}&returnTo=${returnTo}&environment=${environment}`;
  }, []);

  // Same server-redirect shape as LinkedIn. First-time users see Zoho's
  // consent screen once (and the app gets any declared Mail/WorkDrive scopes
  // in that same consent); returning users bounce straight through.
  const signInWithZoho = useCallback(() => {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    const environment = detectEnvironment();
    if (shouldUsePopupFlow()) {
      const url = `${PENTOGGLE_BASE}/api/baas/oauth/zoho/start?mode=signin&appId=${APP_ID}&returnTo=${returnTo}&environment=${environment}&flow=popup`;
      window.open(url, "oauth-signin-zoho", POPUP_FEATURES);
      return;
    }
    window.location.href = `${PENTOGGLE_BASE}/api/baas/oauth/zoho/start?mode=signin&appId=${APP_ID}&returnTo=${returnTo}&environment=${environment}`;
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await fetch(`${API_BASE}/api/baas/auth/logout`, {
      method: "POST",
      headers: buildHeaders(),
      credentials: "include",
    }).catch(() => {});
    setUser(null);
    setAccessToken(null);
    broadcastAuthChange();
  }, [buildHeaders]);

  const resendVerification = useCallback(
    async (email: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/api/baas/auth/resend-verification`, {
        method: "POST",
        headers: buildHeaders(false),
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new AuthError(err.error || "Failed to resend verification email", res.status);
      }
    },
    [buildHeaders],
  );

  const forgotPassword = useCallback(
    async (email: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/api/baas/auth/forgot-password`, {
        method: "POST",
        headers: buildHeaders(false),
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new AuthError(err.error || "Failed to send reset email", res.status);
      }
    },
    [buildHeaders],
  );

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithGoogle, signInWithLinkedin, signInWithZoho, signOut, resendVerification, forgotPassword, refresh, accessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <PentoggleAuthProvider>");
  }
  return ctx;
}
