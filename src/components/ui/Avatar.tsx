import { cn, initials } from '@/lib/utils'

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const sizes = {
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-14 w-14 text-base',
    xl: 'h-20 w-20 text-xl',
  }
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold uppercase text-primary ring-1 ring-primary/20',
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {initials(name || '?')}
    </div>
  )
}