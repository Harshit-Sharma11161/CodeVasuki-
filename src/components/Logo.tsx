import { cn } from '@/lib/utils'

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-primary/15" />
        <path
          d="M8 10c5 0 5 7 10 7s6-3 6-3"
          className="stroke-primary"
          strokeWidth="2.6"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M8 20.5c5 0 5 4 10 4"
          className="stroke-primary/60"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="24" cy="12" r="2.2" className="fill-primary" />
      </svg>
      {showText && (
        <span className="text-lg font-bold tracking-tight text-foreground">
          Code<span className="text-primary">Vasuki</span>
        </span>
      )}
    </span>
  )
}