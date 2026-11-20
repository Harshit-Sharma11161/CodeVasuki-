import type { RatingHistory } from '@/types/models'

export function RatingSparkline({ history }: { history: RatingHistory[] }) {
  if (history.length < 2) {
    return (
      <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
        Play a few battles to build your rating graph.
      </div>
    )
  }
  const points = history.map((h) => h.ratingAfter)
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const w = 300
  const h = 88
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w
    const y = h - ((p - min) / span) * (h - 12) - 6
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const line = coords.join(' ')
  const area = `0,${h} ${line} ${w},${h}`

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full" preserveAspectRatio="none">
        <polygon points={area} className="fill-primary/12" />
        <polyline
          points={line}
          className="stroke-primary"
          strokeWidth="2"
          fill="none"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[11px] text-muted-foreground">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}