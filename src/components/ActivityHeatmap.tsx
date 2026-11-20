type Item = { createdAt: string }

export function ActivityHeatmap({ submissions }: { submissions: Item[] }) {
  const counts = new Map<string, number>()
  submissions.forEach((s) => {
    const key = new Date(s.createdAt).toISOString().slice(0, 10)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })

  const days: { key: string; count: number }[] = []
  const today = new Date()
  for (let i = 55; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000)
    const key = d.toISOString().slice(0, 10)
    days.push({ key, count: counts.get(key) ?? 0 })
  }

  const tone = (c: number) => {
    if (c === 0) return 'bg-muted'
    if (c === 1) return 'bg-primary/30'
    if (c <= 3) return 'bg-primary/55'
    return 'bg-primary'
  }

  return (
    <div>
      <div className="grid grid-flow-col grid-rows-7 gap-1">
        {days.map((d) => (
          <div key={d.key} className={`h-3 w-3 rounded-sm ${tone(d.count)}`} title={`${d.key}: ${d.count}`} />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Last 8 weeks of submission activity</p>
    </div>
  )
}