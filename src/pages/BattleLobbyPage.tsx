import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Swords, X, Radar } from 'lucide-react'
import { useAuth } from '@/lib/pentoggle-auth'
import { useDb } from '@/lib/pentoggle-db'
import { useFunction } from '@/lib/pentoggle-functions'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/States'
import { formatDateTime } from '@/lib/utils'
import type { Battle } from '@/types/models'

type QueueStatus = {
  state: 'idle' | 'searching' | 'matched'
  battleId: string | null
  rating: number
  searchRange: number
  waitedSeconds: number
  candidatesInRange: number
}

export default function BattleLobbyPage() {
  const { user } = useAuth()
  const { profile } = useCurrentUser()
  const { query } = useDb()
  const { call } = useFunction()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [status, setStatus] = useState<QueueStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [recent, setRecent] = useState<Battle[]>([])
  const pollRef = useRef<number | null>(null)

  const loadRecent = useCallback(() => {
    const uid = user?.id
    if (!uid) return
    query<Battle[]>('Battle', 'findMany', {
      where: { OR: [{ playerOneId: uid }, { playerTwoId: uid }] },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { problem: true, playerOne: true, playerTwo: true },
    })
      .then((res) => setRecent(res.data ?? []))
      .catch(() => undefined)
  }, [query, user?.id])

  useEffect(() => {
    loadRecent()
  }, [loadRecent])

  const tick = useCallback(async () => {
    try {
      const res = await call<QueueStatus>('pollMatchmaking', {})
      setStatus(res)
      if (res.state === 'matched' && res.battleId) {
        navigate(`/battles/${res.battleId}`)
      }
    } catch {
      // keep polling; transient failures are non-fatal
    }
  }, [call, navigate])

  useEffect(() => {
    if (status?.state !== 'searching') {
      if (pollRef.current) window.clearInterval(pollRef.current)
      pollRef.current = null
      return
    }
    pollRef.current = window.setInterval(tick, 2000)
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [status?.state, tick])

  useEffect(() => {
    // Resume an in-progress search / active battle on mount.
    call<QueueStatus>('pollMatchmaking', {})
      .then((res) => {
        setStatus(res)
        if (res.state === 'matched' && res.battleId) navigate(`/battles/${res.battleId}`)
      })
      .catch(() => undefined)
  }, [call, navigate])

  const handleJoin = async () => {
    setBusy(true)
    try {
      const res = await call<QueueStatus>('joinMatchmaking', {})
      setStatus(res)
      if (res.state === 'matched' && res.battleId) navigate(`/battles/${res.battleId}`)
    } catch (err) {
      toast({
        title: 'Could not join the queue',
        description: err instanceof Error ? err.message : 'Try again in a moment.',
        tone: 'error',
      })
    } finally {
      setBusy(false)
    }
  }

  const handleLeave = async () => {
    setBusy(true)
    try {
      await call<{ success: boolean }>('leaveMatchmaking', {})
      setStatus({
        state: 'idle',
        battleId: null,
        rating: profile?.rating ?? 1200,
        searchRange: 100,
        waitedSeconds: 0,
        candidatesInRange: 0,
      })
    } finally {
      setBusy(false)
    }
  }

  const searching = status?.state === 'searching'

  return (
    <div className="space-y-6">
      <PageHeader title="Battle arena" description="One problem. Two coders. A synced 30-minute clock." />

      <Card className="overflow-hidden">
        <div className="relative bg-[radial-gradient(70%_100%_at_50%_0%,rgb(var(--primary)/0.15),transparent)] px-5 py-10 text-center">
          {searching ? (
            <>
              <div className="relative mx-auto mb-5 h-20 w-20">
                <span className="absolute inset-0 rounded-full border-2 border-primary/50 animate-pulse-ring" />
                <span className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse-ring [animation-delay:0.5s]" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <Radar className="h-8 w-8" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-foreground">Searching for an opponent…</h2>
              <div className="mx-auto mt-5 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Your rating" value={String(status?.rating ?? '—')} />
                <Stat label="Search range" value={`±${status?.searchRange ?? 100}`} />
                <Stat
                  label="Opponent band"
                  value={`${(status?.rating ?? 1200) - (status?.searchRange ?? 100)}–${
                    (status?.rating ?? 1200) + (status?.searchRange ?? 100)
                  }`}
                />
                <Stat label="Waiting" value={`${status?.waitedSeconds ?? 0}s`} />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                The range widens to ±200 after 15 seconds and ±300 after 30 seconds.
              </p>
              <Button variant="outline" className="mt-6" onClick={handleLeave} loading={busy}>
                <X className="h-4 w-4" />
                Cancel search
              </Button>
            </>
          ) : (
            <>
              <div className="mx-auto mb-5 inline-flex rounded-full bg-primary/12 p-5 text-primary">
                <Swords className="h-9 w-9" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Ready for a 1v1?</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                You'll be matched with a coder inside your rating band. Both of you get the same problem at the same
                moment.
              </p>
              <Button size="lg" className="mt-6" onClick={handleJoin} loading={busy}>
                <Swords className="h-4 w-4" />
                Find opponent
              </Button>
              <p className="mt-3 font-mono text-xs text-muted-foreground">
                Your rating: {profile?.rating ?? '—'}
              </p>
            </>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your recent battles</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState
              title="No battles yet"
              description="Your battle history will appear here after your first match."
              icon={<Swords className="h-7 w-7" />}
            />
          ) : (
            <div className="space-y-2">
              {recent.map((b) => {
                const isP1 = b.playerOneId === user?.id
                const opponent = isP1 ? b.playerTwo : b.playerOne
                const delta = isP1 ? b.playerOneRatingDelta : b.playerTwoRatingDelta
                const result =
                  b.status !== 'completed'
                    ? 'ongoing'
                    : b.winnerId === null
                      ? 'draw'
                      : b.winnerId === user?.id
                        ? 'win'
                        : 'loss'
                return (
                  <Link
                    key={b.id}
                    to={result === 'ongoing' ? `/battles/${b.id}` : `/battles/${b.id}/result`}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 transition hover:border-primary/40 hover:bg-accent/30"
                  >
                    <Avatar name={opponent?.name ?? '?'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">vs {opponent?.name ?? 'Opponent'}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {b.problem?.title ?? 'Problem'} · {formatDateTime(b.createdAt)}
                      </p>
                    </div>
                    <Badge
                      tone={
                        result === 'win'
                          ? 'success'
                          : result === 'loss'
                            ? 'destructive'
                            : result === 'ongoing'
                              ? 'primary'
                              : 'muted'
                      }
                    >
                      {result === 'ongoing' ? 'In progress' : result === 'win' ? 'Win' : result === 'loss' ? 'Loss' : 'Draw'}
                    </Badge>
                    {result !== 'ongoing' && (
                      <span
                        className={`w-10 text-right font-mono text-sm font-semibold ${
                          delta > 0 ? 'text-success' : delta < 0 ? 'text-destructive' : 'text-muted-foreground'
                        }`}
                      >
                        {delta > 0 ? '+' : ''}
                        {delta}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}