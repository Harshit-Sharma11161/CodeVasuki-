import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastTone = 'success' | 'error' | 'info'
type Toast = { id: number; title: string; description?: string; tone: ToastTone }

type ToastContextValue = {
  toast: (t: { title: string; description?: string; tone?: ToastTone }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)
let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    ({ title, description, tone = 'info' }: { title: string; description?: string; tone?: ToastTone }) => {
      const id = ++seq
      setToasts((list) => [...list, { id, title, description, tone }])
      window.setTimeout(() => dismiss(id), 4500)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,22rem)] flex-col gap-2">
        {toasts.map((t) => {
          const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'error' ? AlertTriangle : Info
          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-xl border bg-card p-3 shadow-lg animate-fade-up',
                t.tone === 'success' && 'border-success/40',
                t.tone === 'error' && 'border-destructive/40',
                t.tone === 'info' && 'border-border',
              )}
            >
              <Icon
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  t.tone === 'success' && 'text-success',
                  t.tone === 'error' && 'text-destructive',
                  t.tone === 'info' && 'text-primary',
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-card-foreground">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="rounded p-1 text-muted-foreground transition hover:bg-muted"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}