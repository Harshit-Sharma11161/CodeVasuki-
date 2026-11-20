'use client';
import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// BaaS calls go to the app's own origin. The deployment proxy (for custom
// domains) or the main server's local route handlers (for pentoggle
// subdomains) forward them to the platform in-process, avoiding a cross-origin
// hop and keeping first-party semantics for cookies and CORS.
const API_BASE = typeof window !== 'undefined' ? window.location.origin : 'https://pentoggle.com';
const APP_ID = import.meta.env.VITE_PENTOGGLE_APP_ID || '';

interface FunctionError {
  code: string;
  message: string;
}

export type JobStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface JobSnapshot<TResult = unknown> {
  jobId: string;
  status: JobStatus;
  progress: { done?: number; total?: number; [key: string]: unknown } | null;
  result: TResult | null;
  error: string | null;
  attempt: number;
  maxAttempts: number;
  enqueuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface FunctionContextType {
  call: <T = unknown>(functionName: string, input?: Record<string, unknown>) => Promise<T>;
  getJob: <T = unknown>(jobId: string) => Promise<JobSnapshot<T>>;
  accessToken: string | null;
}

const FunctionContext = createContext<FunctionContextType | null>(null);

export function PentoggleFunctionsProvider({
  children,
  accessToken,
  onAuthRefresh = null,
}: {
  children: React.ReactNode;
  accessToken: string | null;
  /** Optional callback invoked once on 401 to obtain a fresh access token.
   *  Wire `useAuth().refresh` here so expired sessions are renewed silently. */
  onAuthRefresh?: (() => Promise<string | null>) | null;
}) {
  const headersFor = useCallback((token: string | null): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${APP_ID}`,
    };
    if (token) headers['X-User-Token'] = token;
    return headers;
  }, []);

  // Silent refresh on 401: ask the auth provider for a fresh token, retry
  // the request once. If refresh fails, the original 401 propagates.
  const authedFetch = useCallback(
    async (url: string, init: RequestInit): Promise<Response> => {
      const send = (token: string | null) => fetch(url, { ...init, headers: headersFor(token) });
      let res = await send(accessToken);
      if (res.status === 401 && onAuthRefresh) {
        const fresh = await onAuthRefresh();
        if (fresh) res = await send(fresh);
      }
      return res;
    },
    [accessToken, headersFor, onAuthRefresh],
  );

  const call = useCallback(
    async <T = unknown>(functionName: string, input?: Record<string, unknown>): Promise<T> => {
      const response = await authedFetch(
        `${API_BASE}/api/baas/functions/${functionName}`,
        { method: 'POST', body: JSON.stringify(input || {}) },
      );

      const json = await response.json();

      if (!response.ok) {
        const err = json.error as FunctionError | undefined;
        throw new Error(err?.message || 'Function call failed');
      }

      return json.data as T;
    },
    [authedFetch],
  );

  const getJob = useCallback(
    async <T = unknown>(jobId: string): Promise<JobSnapshot<T>> => {
      const response = await authedFetch(`${API_BASE}/api/baas/jobs/${jobId}`, { method: 'GET' });
      const json = await response.json();
      if (!response.ok) {
        const err = json.error as FunctionError | undefined;
        throw new Error(err?.message || 'Job lookup failed');
      }
      return json.data as JobSnapshot<T>;
    },
    [authedFetch],
  );

  const value = useMemo<FunctionContextType>(
    () => ({ call, getJob, accessToken }),
    [call, getJob, accessToken],
  );

  return (
    <FunctionContext.Provider value={value}>
      {children}
    </FunctionContext.Provider>
  );
}

export function useFunction() {
  const ctx = useContext(FunctionContext);
  if (!ctx) throw new Error('useFunction must be used within PentoggleFunctionsProvider');
  return ctx;
}

interface UseJobState<TResult> {
  status: JobStatus | 'idle';
  progress: { done?: number; total?: number; [key: string]: unknown } | null;
  result: TResult | null;
  error: string | null;
  isLoading: boolean;
  isTerminal: boolean;
}

/**
 * Poll a worker-function job until it reaches a terminal state.
 *
 * Use after calling a request function that returns \{ jobId \}:
 *
 *   const { call } = useFunction();
 *   const [jobId, setJobId] = useState<string | null>(null);
 *   const job = useJob(jobId);
 *
 *   const handleClick = async () => {
 *     const result = await call('startExport', { yearId });
 *     setJobId(result.jobId);
 *   };
 *
 *   if (job.status === 'running') return <Progress value={job.progress?.done} max={job.progress?.total} />;
 */
export function useJob<TResult = unknown>(jobId: string | null): UseJobState<TResult> {
  const ctx = useContext(FunctionContext);
  if (!ctx) throw new Error('useJob must be used within PentoggleFunctionsProvider');

  const [state, setState] = useState<UseJobState<TResult>>({
    status: 'idle',
    progress: null,
    result: null,
    error: null,
    isLoading: false,
    isTerminal: false,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!jobId) {
      setState({
        status: 'idle',
        progress: null,
        result: null,
        error: null,
        isLoading: false,
        isTerminal: false,
      });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, isLoading: true }));

    const tick = async () => {
      try {
        const snap = await ctx.getJob<TResult>(jobId);
        if (cancelled) return;
        const terminal = snap.status === 'succeeded' || snap.status === 'failed';
        setState({
          status: snap.status,
          progress: snap.progress,
          result: snap.result,
          error: snap.error,
          isLoading: !terminal,
          isTerminal: terminal,
        });
        if (terminal && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } catch (err) {
        if (cancelled) return;
        setState({
          status: 'failed',
          progress: null,
          result: null,
          error: err instanceof Error ? err.message : 'Job lookup failed',
          isLoading: false,
          isTerminal: true,
        });
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 1500);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [jobId, ctx]);

  return state;
}
