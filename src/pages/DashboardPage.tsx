import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Swords, CheckCircle2, Flame, Code2, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/pentoggle-auth'
import { useFunction } from '@/lib/pentoggle-functions'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { RatingSparkline } from '@/components/RatingSparkline'
import { ActivityHeatmap } from '@/components/ActivityHeatmap'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingBlock, ErrorState, EmptyState } from '@/components/ui/States'
import { difficultyTone, verdictTone } from '@/lib/constants'
import { formatDateTime, winRate } from '@/lib/utils'
import type { Problem, RatingHistory, Submission } from '@/types/models'

type DashboardData = {
  rating: number
  globalRank: number
  universityRank: number
  universityName: string | null
  problemsSolved: number
  battlesPlayed: number
  battlesWon: number
  currentStreak: number
  recentSubmissions: (Submission & { problem: Pick<Problem, 'id' | 'slug' | 'title' | 'difficulty'> | null })[]
  recentBattles: {
    id: string
    result: string
    opponentName: string
    ratingDelta: number
    problemTitle: string
    endedAt: string | null
  }[]
  recommended: Pick<Problem, 'id' | 'slug' | 'title' | 'difficulty' | 'topics'>[]
  ratingHistory: RatingHistory[]
  activity: { createdAt: string }[]
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { profile } = useCurrentUser()
  const { call } = useFunction()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    call<DashboardData>('getDashboard', {})
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your dashboard.'))
      .finally(() => setLoading(false))
  }, [call])

  useEffect(() => {
    if (user?.id) load()
  }, [user?.id, load])

  if (loading) return <LoadingBlock label="Loading your dashboard…" />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!data) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${profile?.name?.split(' ')[0] ?? 'coder'}`}
        description={data.universityName ? `${data.universityName} · Rated ${data.rating}` : `Rated ${data.rating}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/problems">
                <Code2 className="h-4 w-4" />
                Solve a problem
              </Link>
            </Button>
            <Button asChild>
              <Link to="/battles">
                <Swords className="h-4 w-4" />
                Find battle
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Rating"
          value={data.rating}
          hint={`Global #${data.globalRank} · Campus #${data.universityRank}`}
          icon={Trophy}
        />
        <StatCard label="Problems solved" value={data.problemsSolved} hint="Unique accepted problems" icon={CheckCircle2} />
        <StatCard
          label="Battle win rate"
          value={winRate(data.battlesPlayed, data.battlesWon)}
          hint={`${data.battlesWon}W / ${data.battlesPlayed - data.battlesWon}L`}
          icon={Swords}
        />
        <StatCard label="Current streak" value={`${data.currentStreak}d`} hint="Days with a submission" icon={Flame} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Rating history</CardTitle>
          </CardHeader>
          <CardContent>
            <RatingSparkline history={data.ratingHistory} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coding activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityHeatmap submissions={data.activity} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent submissions</CardTitle>
            <Link to="/profile" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentSubmissions.length === 0 ? (
              <EmptyState
                title="No submissions yet"
                description="Pick a problem and send your first solution."
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link to="/problems">Browse problems</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {data.recentSubmissions.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={s.problem ? `/problems/${s.problem.slug}` : '/problems'}
                        className="block truncate text-sm font-medium text-foreground hover:text-primary"
                      >
                        {s.problem?.title ?? 'Problem'}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {s.language} · {formatDateTime(s.createdAt)}
                      </p>
                    </div>
                    <Badge tone={verdictTone(s.verdict)}>{s.verdict}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent battles</CardTitle>
            <Link to="/battles" className="text-xs font-medium text-primary hover:underline">
              Battle lobby
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentBattles.length === 0 ? (
              <EmptyState
                title="No battles yet"
                description="Enter the queue and take on a coder near your rating."
                icon={<Swords className="h-7 w-7" />}
                action={
                  <Button asChild size="sm">
                    <Link to="/battles">Find an opponent</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {data.recentBattles.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 py-2.5">
                    <Badge
                      tone={b.result === 'win' ? 'success' : b.result === 'loss' ? 'destructive' : 'muted'}
                      className="w-14 justify-center"
                    >
                      {b.result === 'win' ? 'Win' : b.result === 'loss' ? 'Loss' : 'Draw'}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">vs {b.opponentName}</p>
                      <p className="truncate text-xs text-muted-foreground">{b.problemTitle}</p>
                    </div>
                    <span
                      className={`font-mono text-sm font-semibold ${
                        b.ratingDelta > 0 ? 'text-success' : b.ratingDelta < 0 ? 'text-destructive' : 'text-muted-foreground'
                      }`}
                    >
                      {b.ratingDelta > 0 ? '+' : ''}
                      {b.ratingDelta}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommended for you</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recommended.length === 0 ? (
            <EmptyState title="You've cleared the catalogue" description="New problems will appear here." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.recommended.map((p) => (
                <Link
                  key={p.id}
                  to={`/problems/${p.slug}`}
                  className="group rounded-lg border border-border p-3 transition hover:border-primary/40 hover:bg-accent/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-foreground group-hover:text-primary">{p.title}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone={difficultyTone(p.difficulty)}>{p.difficulty}</Badge>
                    {p.topics
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((t) => (
                        <Badge key={t} tone="outline">
                          {t}
                        </Badge>
                      ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}