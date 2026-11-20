import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Trophy, Swords, CheckCircle2, Flame, Award } from 'lucide-react'
import { useFunction } from '@/lib/pentoggle-functions'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { RatingSparkline } from '@/components/RatingSparkline'
import { ActivityHeatmap } from '@/components/ActivityHeatmap'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Input'
import { LoadingBlock, ErrorState, EmptyState } from '@/components/ui/States'
import { difficultyTone, verdictTone } from '@/lib/constants'
import { formatDate, formatDateTime, winRate } from '@/lib/utils'
import type { RatingHistory } from '@/types/models'

type Payload = {
  user: {
    id: string
    name: string
    email: string | null
    universityName: string | null
    rating: number
    globalRank: number
    universityRank: number
    problemsSolved: number
    battlesPlayed: number
    battlesWon: number
    contestPoints: number
    currentStreak: number
    createdAt: string
  }
  isSelf: boolean
  ratingHistory: RatingHistory[]
  achievements: { id: string; code: string; title: string; description: string; earnedAt: string }[]
  solvedProblems: { id: string; slug: string; title: string; difficulty: string }[]
  recentSubmissions: {
    id: string
    verdict: string
    language: string
    createdAt: string
    problemTitle: string
    problemSlug: string
  }[]
  battleHistory: {
    id: string
    opponentName: string
    result: string
    ratingBefore: number
    ratingDelta: number
    ratingAfter: number
    problemTitle: string
    durationMs: number
    endedAt: string | null
  }[]
  activity: { createdAt: string }[]
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { call } = useFunction()
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [battleFilter, setBattleFilter] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    call<Payload>('getProfile', { userId: userId ?? null })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load this profile.'))
      .finally(() => setLoading(false))
  }, [call, userId])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <LoadingBlock />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!data) return null

  const u = data.user
  const battles = battleFilter ? data.battleHistory.filter((b) => b.result === battleFilter) : data.battleHistory

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" />

      <Card>
        <CardContent className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
          <Avatar name={u.name} size="xl" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold text-foreground">{u.name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {u.universityName ?? 'No university'} · Joined {formatDate(u.createdAt)}
            </p>
            {data.isSelf && u.email && <p className="mt-0.5 text-sm text-muted-foreground">{u.email}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="primary">Rating {u.rating}</Badge>
              <Badge tone="outline">Global #{u.globalRank}</Badge>
              <Badge tone="outline">Campus #{u.universityRank}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Problems solved" value={u.problemsSolved} icon={CheckCircle2} />
        <StatCard
          label="Battles"
          value={u.battlesPlayed}
          hint={`${u.battlesWon}W / ${u.battlesPlayed - u.battlesWon}L`}
          icon={Swords}
        />
        <StatCard label="Win rate" value={winRate(u.battlesPlayed, u.battlesWon)} icon={Trophy} />
        <StatCard label="Current streak" value={`${u.currentStreak}d`} icon={Flame} />
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
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityHeatmap submissions={data.activity} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          {data.achievements.length === 0 ? (
            <EmptyState
              title="No badges yet"
              description="Win battles, solve problems and keep a streak to earn badges."
              icon={<Award className="h-7 w-7" />}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.achievements.map((a) => (
                <div key={a.id} className="flex gap-3 rounded-lg border border-border p-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Award className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDate(a.earnedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Solved problems ({data.solvedProblems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {data.solvedProblems.length === 0 ? (
              <EmptyState title="No solved problems yet" />
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.solvedProblems.map((p) => (
                  <Link
                    key={p.id}
                    to={`/problems/${p.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-foreground transition hover:border-primary/40 hover:text-primary"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full bg-${difficultyTone(p.difficulty)}`} />
                    {p.title}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentSubmissions.length === 0 ? (
              <EmptyState title="No submissions yet" />
            ) : (
              <ul className="divide-y divide-border">
                {data.recentSubmissions.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/problems/${s.problemSlug}`}
                        className="block truncate text-sm font-medium text-foreground hover:text-primary"
                      >
                        {s.problemTitle}
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
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Battle history</CardTitle>
          <Select
            value={battleFilter}
            onChange={(e) => setBattleFilter(e.target.value)}
            className="h-8 w-auto text-xs"
            aria-label="Filter battles"
          >
            <option value="">All</option>
            <option value="win">Wins</option>
            <option value="loss">Losses</option>
            <option value="draw">Draws</option>
          </Select>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {battles.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No battles match this filter" />
            </div>
          ) : (
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="border-y border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Opponent</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Problem</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {battles.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 text-foreground">{b.opponentName}</td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={b.result === 'win' ? 'success' : b.result === 'loss' ? 'destructive' : 'muted'}
                      >
                        {b.result === 'win' ? 'Win' : b.result === 'loss' ? 'Loss' : 'Draw'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{b.problemTitle}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <span className="text-muted-foreground">{b.ratingBefore}</span>{' '}
                      <span
                        className={
                          b.ratingDelta > 0
                            ? 'text-success'
                            : b.ratingDelta < 0
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                        }
                      >
                        {b.ratingDelta > 0 ? '+' : ''}
                        {b.ratingDelta}
                      </span>{' '}
                      <span className="font-semibold text-foreground">{b.ratingAfter}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(b.endedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}