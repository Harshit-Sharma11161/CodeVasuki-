import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Trophy, Swords, User as UserIcon, Handshake } from 'lucide-react'
import { useFunction } from '@/lib/pentoggle-functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingBlock, ErrorState } from '@/components/ui/States'
import { formatDateTime, formatDuration } from '@/lib/utils'

type Side = {
  userId: string
  name: string
  solved: boolean
  solveTimeMs: number | null
  runtimeMs: number
  memoryKb: number
  testsPassed: number
  failedAttempts: number
  score: number
  ratingBefore: number
  ratingDelta: number
  ratingAfter: number
}

type ResultPayload = {
  battleId: string
  status: string
  winnerId: string | null
  reason: string
  problem: { title: string; slug: string; difficulty: string }
  startedAt: string | null
  endedAt: string | null
  me: Side
  opponent: Side
  timeline: { id: string; message: string; createdAt: string }[]
}

export default function BattleResultPage() {
  const { id } = useParams<{ id: string }>()
  const { call } = useFunction()
  const navigate = useNavigate()
  const [data, setData] = useState<ResultPayload | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    call<ResultPayload>('getBattleResult', { battleId: id })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load this result.'))
      .finally(() => setLoading(false))
  }, [id, call])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <LoadingBlock label="Scoring the battle…" />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!data) return null

  const outcome =
    data.winnerId === null ? 'draw' : data.winnerId === data.me.userId ? 'win' : 'loss'

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Card className="overflow-hidden text-center">
        <div
          className={`px-5 py-8 ${
            outcome === 'win'
              ? 'bg-[radial-gradient(70%_100%_at_50%_0%,rgb(var(--success)/0.18),transparent)]'
              : outcome === 'loss'
                ? 'bg-[radial-gradient(70%_100%_at_50%_0%,rgb(var(--destructive)/0.15),transparent)]'
                : 'bg-muted/40'
          }`}
        >
          <div className="mx-auto mb-3 inline-flex rounded-full bg-card p-4 ring-1 ring-border">
            {outcome === 'win' ? (
              <Trophy className="h-8 w-8 text-success" />
            ) : outcome === 'loss' ? (
              <Swords className="h-8 w-8 text-destructive" />
            ) : (
              <Handshake className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {outcome === 'win' ? 'Victory' : outcome === 'loss' ? 'Defeat' : 'Draw'}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{data.reason}</p>
          <p className="mt-3 text-sm text-foreground">
            {data.problem.title} ·{' '}
            <span className="text-muted-foreground">{data.problem.difficulty}</span>
          </p>
        </div>

        <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
          <RatingDelta side={data.me} label="You" highlight={outcome === 'win'} />
          <RatingDelta side={data.opponent} label="Opponent" highlight={outcome === 'loss'} />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Head-to-head</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-y border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Metric</th>
                <th className="px-4 py-2.5">{data.me.name}</th>
                <th className="px-4 py-2.5">{data.opponent.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <Row
                label="Solved"
                a={data.me.solved ? 'Yes' : 'No'}
                b={data.opponent.solved ? 'Yes' : 'No'}
              />
              <Row
                label="Solve time"
                a={data.me.solveTimeMs ? formatDuration(data.me.solveTimeMs) : '—'}
                b={data.opponent.solveTimeMs ? formatDuration(data.opponent.solveTimeMs) : '—'}
              />
              <Row label="Runtime" a={`${data.me.runtimeMs} ms`} b={`${data.opponent.runtimeMs} ms`} />
              <Row label="Memory" a={`${data.me.memoryKb} KB`} b={`${data.opponent.memoryKb} KB`} />
              <Row label="Tests passed" a={String(data.me.testsPassed)} b={String(data.opponent.testsPassed)} />
              <Row
                label="Failed attempts"
                a={String(data.me.failedAttempts)}
                b={String(data.opponent.failedAttempts)}
              />
              <Row label="Battle score" a={String(data.me.score)} b={String(data.opponent.score)} />
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {data.timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events were recorded for this battle.</p>
          ) : (
            <ul className="space-y-2.5">
              {data.timeline.map((e) => (
                <li key={e.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="text-card-foreground">{e.message}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(e.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => navigate('/battles')}>
          <Swords className="h-4 w-4" />
          Find new opponent
        </Button>
        <Button asChild variant="outline">
          <Link to={`/problems/${data.problem.slug}`}>Review the problem</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/profile">
            <UserIcon className="h-4 w-4" />
            View profile
          </Link>
        </Button>
      </div>
    </div>
  )
}

function RatingDelta({ side, label, highlight }: { side: Side; label: string; highlight: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 text-left ${
        highlight ? 'border-primary/40 bg-primary/5' : 'border-border'
      }`}
    >
      <div className="flex items-center gap-2">
        <Avatar name={side.name} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{side.name}</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2 font-mono">
        <span className="text-sm text-muted-foreground">{side.ratingBefore}</span>
        <span
          className={`text-base font-bold ${
            side.ratingDelta > 0 ? 'text-success' : side.ratingDelta < 0 ? 'text-destructive' : 'text-muted-foreground'
          }`}
        >
          {side.ratingDelta > 0 ? '+' : ''}
          {side.ratingDelta}
        </span>
        <span className="text-lg font-bold text-foreground">→ {side.ratingAfter}</span>
      </div>
      <div className="mt-2">
        <Badge tone={side.solved ? 'success' : 'muted'}>{side.solved ? 'Solved' : 'Unsolved'}</Badge>
      </div>
    </div>
  )
}

function Row({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <tr>
      <td className="px-4 py-2.5 text-muted-foreground">{label}</td>
      <td className="px-4 py-2.5 font-mono text-foreground">{a}</td>
      <td className="px-4 py-2.5 font-mono text-foreground">{b}</td>
    </tr>
  )
}