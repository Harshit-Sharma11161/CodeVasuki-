import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/pentoggle-auth'
import { useDb } from '@/lib/pentoggle-db'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { DIFFICULTIES, TOPICS, difficultyTone } from '@/lib/constants'
import { acceptanceRate, parseList } from '@/lib/utils'
import type { Problem, Submission } from '@/types/models'

const PAGE_SIZE = 20

export default function ProblemsPage() {
  const { user } = useAuth()
  const { query, batch } = useDb()

  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [topic, setTopic] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)

  const [problems, setProblems] = useState<Problem[]>([])
  const [total, setTotal] = useState(0)
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const uid = user?.id
    if (!uid) return
    query<Submission[]>('Submission', 'findMany', {
      where: { userId: uid, verdict: 'Accepted' },
      select: { id: true, problemId: true },
      take: 1000,
    })
      .then((res) => {
        if (cancelled) return
        setSolvedIds(new Set((res.data ?? []).map((s) => s.problemId)))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [user?.id, query])

  const where = useMemo(() => {
    const clauses: Record<string, unknown>[] = [{ isActive: true }]
    if (search.trim()) clauses.push({ title: { contains: search.trim() } })
    if (difficulty) clauses.push({ difficulty })
    if (topic) clauses.push({ topics: { contains: topic } })
    return clauses.length === 1 ? clauses[0] : { AND: clauses }
  }, [search, difficulty, topic])

  const load = useCallback(
    (p: number) => {
      setLoading(true)
      setError('')
      batch([
        {
          model: 'Problem',
          action: 'findMany',
          args: { where, orderBy: { number: 'asc' }, take: PAGE_SIZE, skip: p * PAGE_SIZE },
        },
        { model: 'Problem', action: 'count', args: { where } },
      ])
        .then((res) => {
          const [listRes, countRes] = res as unknown as [{ data: Problem[] }, { data: number }]
          setProblems(listRes.data ?? [])
          setTotal(countRes.data ?? 0)
          setPage(p)
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Could not load problems.'))
        .finally(() => setLoading(false))
    },
    [batch, where],
  )

  useEffect(() => {
    load(0)
  }, [load])

  const visible = useMemo(() => {
    if (!status) return problems
    return problems.filter((p) => (status === 'solved' ? solvedIds.has(p.id) : !solvedIds.has(p.id)))
  }, [problems, status, solvedIds])

  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1)

  return (
    <div>
      <PageHeader
        title="Problems"
        description={`${total} problems across arrays, graphs, dynamic programming and more.`}
      />

      <Card className="mb-4 p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Difficulty">
            <option value="">All difficulties</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
          <Select value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Topic">
            <option value="">All topics</option>
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">All statuses</option>
            <option value="solved">Solved</option>
            <option value="unsolved">Unsolved</option>
          </Select>
        </div>
      </Card>

      {error ? (
        <ErrorState message={error} onRetry={() => load(page)} />
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          title="No problems match these filters"
          description="Try clearing the search or picking a different topic."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('')
                setDifficulty('')
                setTopic('')
                setStatus('')
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {visible.map((p) => {
            const solved = solvedIds.has(p.id)
            return (
              <Link
                key={p.id}
                to={`/problems/${p.slug}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition hover:border-primary/40 hover:bg-accent/30 sm:p-4"
              >
                <span className="w-9 shrink-0 font-mono text-xs text-muted-foreground">#{p.number}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {solved && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
                    <span className="truncate text-sm font-medium text-card-foreground">{p.title}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {parseList(p.topics)
                      .slice(0, 3)
                      .map((t) => (
                        <Badge key={t} tone="outline">
                          {t}
                        </Badge>
                      ))}
                  </div>
                </div>
                <div className="hidden w-20 shrink-0 text-right font-mono text-xs text-muted-foreground sm:block">
                  {acceptanceRate(p.totalSubmissions, p.acceptedSubmissions)}
                </div>
                <Badge tone={difficultyTone(p.difficulty)} className="shrink-0">
                  {p.difficulty}
                </Badge>
              </Link>
            )
          })}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} of {maxPage + 1}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => load(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= maxPage} onClick={() => load(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}