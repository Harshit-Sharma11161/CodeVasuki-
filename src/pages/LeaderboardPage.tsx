import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { useAuth } from '@/lib/pentoggle-auth'
import { useFunction } from '@/lib/pentoggle-functions'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingBlock, ErrorState, EmptyState } from '@/components/ui/States'
import { winRate } from '@/lib/utils'

type Row = {
  rank: number
  userId: string
  name: string
  universityName: string | null
  rating: number
  problemsSolved: number
  battlesPlayed: number
  battlesWon: number
}

type Payload = { rows: Row[]; total: number; myRank: number | null }

const PAGE_SIZE = 25

export default function LeaderboardPage() {
  const { user } = useAuth()
  const { call } = useFunction()
  const [scope, setScope] = useState<'global' | 'university'>('global')
  const [page, setPage] = useState(0)
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(
    (s: 'global' | 'university', p: number) => {
      setLoading(true)
      setError('')
      call<Payload>('getLeaderboard', { scope: s, page: p, pageSize: PAGE_SIZE })
        .then((res) => {
          setData(res)
          setPage(p)
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the leaderboard.'))
        .finally(() => setLoading(false))
    },
    [call],
  )

  useEffect(() => {
    load(scope, 0)
  }, [scope, load])

  const maxPage = data ? Math.max(0, Math.ceil(data.total / PAGE_SIZE) - 1) : 0

  return (
    <div>
      <PageHeader
        title="Leaderboard"
        description={
          data?.myRank
            ? `You are currently ranked #${data.myRank} in this board.`
            : 'Ranked by rating, then problems solved.'
        }
      />

      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-card p-1">
        {(['global', 'university'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              scope === s ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'global' ? 'Global' : 'My university'}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load(scope, page)} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState title="No ranked coders yet" description="Solve problems and win battles to appear here." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[42rem] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Coder</th>
                  <th className="px-4 py-3">University</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Solved</th>
                  <th className="px-4 py-3">Battles</th>
                  <th className="px-4 py-3">Win rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.rows.map((r) => (
                  <tr key={r.userId} className={r.userId === user?.id ? 'bg-primary/5' : undefined}>
                    <td className="px-4 py-3">
                      {r.rank <= 3 ? (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-primary">
                          <Trophy className="h-3.5 w-3.5" />
                          {r.rank}
                        </span>
                      ) : (
                        <span className="font-mono text-muted-foreground">{r.rank}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/profile/${r.userId}`} className="flex items-center gap-2 hover:text-primary">
                        <Avatar name={r.name} size="sm" />
                        <span className="truncate font-medium text-foreground">{r.name}</span>
                        {r.userId === user?.id && <Badge tone="primary">You</Badge>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.universityName ?? '—'}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-primary">{r.rating}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{r.problemsSolved}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{r.battlesPlayed}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {winRate(r.battlesPlayed, r.battlesWon)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {data && data.total > PAGE_SIZE && (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} of {maxPage + 1}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => load(scope, page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= maxPage} onClick={() => load(scope, page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}