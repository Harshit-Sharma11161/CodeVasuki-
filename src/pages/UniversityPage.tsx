import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, Users, Trophy, CheckCircle2, Swords } from 'lucide-react'
import { useAuth } from '@/lib/pentoggle-auth'
import { useFunction } from '@/lib/pentoggle-functions'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { LoadingBlock, ErrorState, EmptyState } from '@/components/ui/States'

type Payload = {
  university: { id: string; name: string; location: string } | null
  totalMembers: number
  averageRating: number
  totalProblemsSolved: number
  totalBattleWins: number
  contestPoints: number
  universityRank: number
  topStudents: {
    rank: number
    userId: string
    name: string
    rating: number
    problemsSolved: number
    battlesWon: number
    contestPoints: number
    competitiveScore: number
  }[]
}

export default function UniversityPage() {
  const { user } = useAuth()
  const { call } = useFunction()
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    call<Payload>('getUniversityOverview', {})
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your university page.'))
      .finally(() => setLoading(false))
  }, [call])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <LoadingBlock />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!data?.university) {
    return (
      <EmptyState
        title="No university linked to your account"
        description="Set your university in Settings to see campus rankings."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title={data.university.name} description={data.university.location} />

      <Card className="overflow-hidden">
        <div className="flex flex-col items-start gap-4 bg-[radial-gradient(60%_100%_at_0%_0%,rgb(var(--primary)/0.14),transparent)] p-5 sm:flex-row sm:items-center">
          <div className="rounded-xl bg-primary/12 p-4 text-primary">
            <GraduationCap className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">University rank</p>
            <p className="font-mono text-3xl font-bold text-foreground">#{data.universityRank}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ranked by average member rating across all universities on CodeVasuki.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Members" value={data.totalMembers} icon={Users} />
        <StatCard label="Average rating" value={data.averageRating} icon={Trophy} />
        <StatCard label="Problems solved" value={data.totalProblemsSolved} icon={CheckCircle2} />
        <StatCard label="Battle wins" value={data.totalBattleWins} icon={Swords} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campus rankings</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {data.topStudents.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No ranked students yet" />
            </div>
          ) : (
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="border-y border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Solved</th>
                  <th className="px-4 py-3">Battle wins</th>
                  <th className="px-4 py-3">Contest pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.topStudents.map((s) => (
                  <tr key={s.userId} className={s.userId === user?.id ? 'bg-primary/5' : undefined}>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{s.rank}</td>
                    <td className="px-4 py-3">
                      <Link to={`/profile/${s.userId}`} className="flex items-center gap-2 hover:text-primary">
                        <Avatar name={s.name} size="sm" />
                        <span className="truncate font-medium text-foreground">{s.name}</span>
                        {s.userId === user?.id && <Badge tone="primary">You</Badge>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-primary">{s.competitiveScore}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{s.rating}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{s.problemsSolved}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{s.battlesWon}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{s.contestPoints}</td>
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