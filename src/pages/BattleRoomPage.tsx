import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Clock, Wifi, WifiOff, Swords } from 'lucide-react'
import { useAuth } from '@/lib/pentoggle-auth'
import { useFunction } from '@/lib/pentoggle-functions'
import { useToast } from '@/hooks/useToast'
import CodeEditorPanel from '@/components/CodeEditorPanel'
import JudgeResultPanel, { type JudgeResult } from '@/components/JudgeResultPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingBlock, ErrorState } from '@/components/ui/States'
import { difficultyTone, type LanguageId } from '@/lib/constants'
import { starterCodeFor, draftKey } from '@/lib/starterCode'
import { formatDuration, parseList } from '@/lib/utils'

type BattleStatePayload = {
  battle: {
    id: string
    status: string
    serverNow: number
    startsAtMs: number | null
    endsAtMs: number | null
    winnerId: string | null
  }
  problem: {
    id: string
    number: number
    title: string
    difficulty: string
    topics: string
    description: string
    constraints: string
    examples: string
    starterCode: string
    timeLimitMs: number
    memoryLimitMb: number
  }
  me: {
    userId: string
    name: string
    rating: number
    solved: boolean
    failedAttempts: number
    testsPassed: number
  }
  opponent: {
    userId: string
    name: string
    rating: number
    solved: boolean
    submitted: boolean
    online: boolean
  }
  events: { id: string; type: string; message: string; createdAt: string }[]
}

type Example = { input: string; output: string; explanation?: string }

export default function BattleRoomPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { call } = useFunction()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [state, setState] = useState<BattleStatePayload | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(true)
  const [clockMs, setClockMs] = useState(0)
  const [countdown, setCountdown] = useState<number | null>(null)

  const [language, setLanguage] = useState<LanguageId>('python')
  const [code, setCode] = useState('')
  const [runResult, setRunResult] = useState<JudgeResult | null>(null)
  const [submitResult, setSubmitResult] = useState<JudgeResult | null>(null)
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const driftRef = useRef(0)
  const startedShownRef = useRef(false)
  const prevOpponentRef = useRef<{ solved: boolean; submitted: boolean; online: boolean } | null>(null)

  const sync = useCallback(async () => {
    if (!id) return
    try {
      const res = await call<BattleStatePayload>('getBattleState', { battleId: id })
      driftRef.current = res.battle.serverNow - Date.now()
      setState(res)
      setConnected(true)
      setError('')

      const prev = prevOpponentRef.current
      if (prev) {
        if (!prev.solved && res.opponent.solved) {
          toast({ title: 'Opponent solved the problem', tone: 'error' })
        } else if (!prev.submitted && res.opponent.submitted) {
          toast({ title: 'Opponent submitted an attempt', tone: 'info' })
        }
        if (prev.online && !res.opponent.online) {
          toast({ title: 'Opponent disconnected', tone: 'info' })
        }
      }
      prevOpponentRef.current = {
        solved: res.opponent.solved,
        submitted: res.opponent.submitted,
        online: res.opponent.online,
      }

      if (res.battle.status === 'completed') {
        navigate(`/battles/${res.battle.id}/result`, { replace: true })
      }
    } catch (err) {
      setConnected(false)
      if (!state) setError(err instanceof Error ? err.message : 'Could not join this battle.')
    } finally {
      setLoading(false)
    }
  }, [id, call, navigate, toast, state])

  useEffect(() => {
    sync()
    const t = window.setInterval(sync, 4000)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!state?.battle.endsAtMs) return
    const tick = () => {
      const now = Date.now() + driftRef.current
      const startsAt = state.battle.startsAtMs ?? 0
      if (now < startsAt) {
        setCountdown(Math.ceil((startsAt - now) / 1000))
        setClockMs(state.battle.endsAtMs! - startsAt)
      } else {
        setCountdown(null)
        setClockMs(Math.max(0, state.battle.endsAtMs! - now))
      }
    }
    tick()
    const t = window.setInterval(tick, 500)
    return () => window.clearInterval(t)
  }, [state?.battle.endsAtMs, state?.battle.startsAtMs])

  useEffect(() => {
    if (countdown === null && state && !startedShownRef.current && state.battle.status === 'active') {
      startedShownRef.current = true
    }
  }, [countdown, state])

  useEffect(() => {
    if (!state?.problem) return
    const key = draftKey(state.problem.id, language, state.battle.id)
    const saved = window.localStorage.getItem(key)
    setCode(saved ?? starterCodeFor(state.problem.starterCode, language))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.problem?.id, language])

  useEffect(() => {
    if (!state?.problem || !code) return
    const key = draftKey(state.problem.id, language, state.battle.id)
    const t = window.setTimeout(() => window.localStorage.setItem(key, code), 600)
    return () => window.clearTimeout(t)
  }, [code, state?.problem, state?.battle.id, language])

  const examples = useMemo<Example[]>(() => {
    if (!state?.problem.examples) return []
    try {
      const parsed = JSON.parse(state.problem.examples)
      return Array.isArray(parsed) ? (parsed as Example[]) : []
    } catch {
      return []
    }
  }, [state?.problem.examples])

  const handleRun = async () => {
    if (!state) return
    setRunning(true)
    try {
      const res = await call<JudgeResult>('runCode', {
        problemId: state.problem.id,
        language,
        sourceCode: code,
      })
      setRunResult(res)
      setSubmitResult(null)
    } catch (err) {
      toast({ title: 'Run failed', description: err instanceof Error ? err.message : '', tone: 'error' })
    } finally {
      setRunning(false)
    }
  }

  const handleSubmit = async () => {
    if (!state || !id) return
    setSubmitting(true)
    try {
      const res = await call<JudgeResult & { battleStatus: string }>('submitBattleSolution', {
        battleId: id,
        language,
        sourceCode: code,
      })
      setSubmitResult(res)
      setRunResult(null)
      toast({
        title: res.verdict,
        description: `${res.testsPassed}/${res.testsTotal} tests passed`,
        tone: res.verdict === 'Accepted' ? 'success' : 'error',
      })
      await sync()
    } catch (err) {
      toast({
        title: 'Submission failed',
        description: err instanceof Error ? err.message : 'Could not reach the judge.',
        tone: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingBlock label="Entering the arena…" />
  if (error) return <ErrorState message={error} onRetry={sync} />
  if (!state) return null

  const lowTime = clockMs < 5 * 60 * 1000

  return (
    <div className="space-y-4">
      {countdown !== null && countdown >= 0 && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur">
          <div className="flex items-center gap-6">
            <PlayerCard name={state.me.name} rating={state.me.rating} />
            <div className="text-center">
              <Swords className="mx-auto h-10 w-10 text-primary" />
              <p className="mt-1 text-2xl font-black tracking-widest text-muted-foreground">VS</p>
            </div>
            <PlayerCard name={state.opponent.name} rating={state.opponent.rating} />
          </div>
          <p className="mt-10 font-mono text-7xl font-black text-primary animate-fade-up" key={countdown}>
            {countdown === 0 ? 'GO' : countdown}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {countdown === 0 ? 'Battle start' : 'Get ready…'}
          </p>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="grid grid-cols-3 items-center gap-2 px-3 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar name={state.me.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{state.me.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{state.me.rating}</p>
            </div>
            {state.me.solved && <Badge tone="success">Solved</Badge>}
          </div>

          <div className="text-center">
            <div
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-lg font-bold ${
                lowTime ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-border text-foreground'
              }`}
            >
              <Clock className="h-4 w-4" />
              {formatDuration(clockMs)}
            </div>
            <div className="mt-1 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              {connected ? (
                <>
                  <Wifi className="h-3 w-3 text-success" /> Synced
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-destructive" /> Reconnecting…
                </>
              )}
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2">
            {state.opponent.solved && <Badge tone="destructive">Solved</Badge>}
            {!state.opponent.online && <Badge tone="muted">Offline</Badge>}
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-semibold text-foreground">{state.opponent.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{state.opponent.rating}</p>
            </div>
            <Avatar name={state.opponent.name} size="sm" />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">#{state.problem.number}</span>
                <CardTitle className="text-lg">{state.problem.title}</CardTitle>
                <Badge tone={difficultyTone(state.problem.difficulty)}>{state.problem.difficulty}</Badge>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {parseList(state.problem.topics).map((t) => (
                  <Badge key={t} tone="outline">
                    {t}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-card-foreground">
                {state.problem.description}
              </div>
              {examples.map((ex, i) => (
                <div key={i} className="rounded-lg border border-border bg-muted/50 p-3 font-mono text-xs">
                  <p className="mb-1.5 font-sans text-[11px] uppercase tracking-wide text-muted-foreground">
                    Example {i + 1}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Input: </span>
                    {ex.input}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Output: </span>
                    {ex.output}
                  </p>
                </div>
              ))}
              {state.problem.constraints && (
                <pre className="whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs text-foreground">
                  {state.problem.constraints}
                </pre>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Battle events</CardTitle>
            </CardHeader>
            <CardContent>
              {state.events.length === 0 ? (
                <p className="text-sm text-muted-foreground">Events from both sides will appear here.</p>
              ) : (
                <ul className="space-y-2">
                  {state.events.map((e) => (
                    <li key={e.id} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span className="text-card-foreground">{e.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <CodeEditorPanel
            problemId={state.problem.id}
            battleId={state.battle.id}
            starterCodeJson={state.problem.starterCode}
            language={language}
            onLanguageChange={setLanguage}
            code={code}
            onCodeChange={setCode}
            onRun={handleRun}
            onSubmit={handleSubmit}
            running={running}
            submitting={submitting}
            disabled={state.me.solved || clockMs <= 0 || countdown !== null}
          />

          {state.me.solved && (
            <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-foreground">
              You solved it. The result locks in when your opponent finishes or the clock runs out.
            </div>
          )}

          <JudgeResultPanel
            result={submitResult ?? runResult}
            title={submitResult ? 'Battle submission' : 'Sample test run'}
          />
        </div>
      </div>
    </div>
  )
}

function PlayerCard({ name, rating }: { name: string; rating: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Avatar name={name} size="xl" />
      <p className="max-w-[9rem] truncate text-sm font-semibold text-foreground">{name}</p>
      <p className="font-mono text-xs text-primary">{rating}</p>
    </div>
  )
}