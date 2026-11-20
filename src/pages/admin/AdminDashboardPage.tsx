import { useCallback, useEffect, useState } from 'react'
import { Users, Code2, FileCheck2, Swords } from 'lucide-react'
import { useFunction } from '@/lib/pentoggle-functions'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingBlock, ErrorState } from '@/components/ui/States'

type Payload = {
  totalUsers: number
  activeUsers: number
  totalProblems: number
  totalSubmissions: number
  acceptedSubmissions: number
  totalBattles: number
  dailySubmissions: { date: string; count: number }[]
  dailyBattles: { date: string; count: number }[]
  difficultyBreakdown: { difficulty: string; solved: number }[]
}

export default function AdminDashboardPage() {
  const { call } = useFunction()
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    call<Payload>('getAdminStats', {})
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load platform statistics.'))
      .finally(() => setLoading(false))
  }, [call])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <LoadingBlock />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!data) return null

  const acceptance = data.totalSubmissions
    ? `${Math.round((data.acceptedSubmissions / data.totalSubmissions) * 100)}%`
    : '—'

  return (
    <div className="space-y-6">
      <PageHeader title="Platform overview" description="Live activity across CodeVasuki." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users" value={data.totalUsers} hint={`${data.activeUsers} active`} icon={Users} />
        <StatCard label="Problems" value={data.totalProblems} icon={Code2} />
        <StatCard
          label="Submissions"
          value={data.totalSubmissions}
          hint={`${acceptance} accepted`}
          icon={FileCheck2}
        />
        <StatCard label="Battles" value={data.totalBattles} icon={Swords} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Submissions per day</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={data.dailySubmissions} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Battles per day</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={data.dailyBattles} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accepted solutions by difficulty</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.difficultyBreakdown.map((d) => {
              const max = Math.max(1, ...data.difficultyBreakdown.map((x) => x.solved))
              return (
                <div key={d.difficulty}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-foreground">{d.difficulty}</span>
                    <span className="font-mono text-muted-foreground">{d.solved}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(d.solved / max) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function BarChart({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
  }
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div>
      <div className="flex h-32 items-end gap-1">
        {data.map((d) => (
          <div key={d.date} className="group flex flex-1 flex-col items-center justify-end">
            <div
              className="w-full rounded-t bg-primary/70 transition group-hover:bg-primary"
              style={{ height: `${Math.max(3, (d.count / max) * 100)}%` }}
              title={`${d.date}: ${d.count}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  )
}