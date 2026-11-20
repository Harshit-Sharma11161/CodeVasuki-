import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/pentoggle-auth'
import { useDb } from '@/lib/pentoggle-db'
import { useFunction } from '@/lib/pentoggle-functions'
import { useToast } from '@/hooks/useToast'
import CodeEditorPanel from '@/components/CodeEditorPanel'
import JudgeResultPanel, { type JudgeResult } from '@/components/JudgeResultPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingBlock, ErrorState, EmptyState } from '@/components/ui/States'
import { difficultyTone, verdictTone, type LanguageId } from '@/lib/constants'
import { starterCodeFor, draftKey } from '@/lib/starterCode'
import { acceptanceRate, formatDateTime, parseList } from '@/lib/utils'
import type { Problem, Submission, TestCase } from '@/types/models'

type Example = { input: string; output: string; explanation?: string }

export default function ProblemDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const { query, batch } = useDb()
  const { call } = useFunction()
  const { toast } = useToast()

  const [problem, setProblem] = useState<Problem | null>(null)
  const [samples, setSamples] = useState<TestCase[]>([])
  const [history, setHistory] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [language, setLanguage] = useState<LanguageId>('python')
  const [code, setCode] = useState('')
  const [runResult, setRunResult] = useState<JudgeResult | null>(null)
  const [submitResult, setSubmitResult] = useState<JudgeResult | null>(null)
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState<'result' | 'history'>('result')

  const loadHistory = useCallback(
    (problemId: string) => {
      const uid = user?.id
      if (!uid) return
      query<Submission[]>('Submission', 'findMany', {
        where: { userId: uid, problemId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
        .then((res) => setHistory(res.data ?? []))
        .catch(() => undefined)
    },
    [query, user?.id],
  )

  useEffect(() => {
    let cancelled = false
    if (!slug) return
    setLoading(true)
    setError('')
    query<Problem | null>('Problem', 'findUnique', { where: { slug } })
      .then(async (res) => {
        const p = res.data ?? null
        if (cancelled) return
        if (!p) {
          setError('That problem could not be found.')
          setLoading(false)
          return
        }
        setProblem(p)
        const [casesRes] = (await batch([
          {
            model: 'TestCase',
            action: 'findMany',
            args: { where: { problemId: p.id, isHidden: false }, orderBy: { orderIndex: 'asc' }, take: 10 },
          },
        ])) as unknown as [{ data: TestCase[] }]
        if (!cancelled) setSamples(casesRes.data ?? [])
        loadHistory(p.id)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load this problem.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug, query, batch, loadHistory])

  useEffect(() => {
    if (!problem) return
    const key = draftKey(problem.id, language)
    const saved = window.localStorage.getItem(key)
    setCode(saved ?? starterCodeFor(problem.starterCode, language))
  }, [problem, language])

  useEffect(() => {
    if (!problem || !code) return
    const key = draftKey(problem.id, language)
    const t = window.setTimeout(() => window.localStorage.setItem(key, code), 600)
    return () => window.clearTimeout(t)
  }, [code, problem, language])

  const examples = useMemo<Example[]>(() => {
    if (!problem?.examples) return []
    try {
      const parsed = JSON.parse(problem.examples)
      return Array.isArray(parsed) ? (parsed as Example[]) : []
    } catch {
      return []
    }
  }, [problem])

  const handleRun = async () => {
    if (!problem) return
    setRunning(true)
    setTab('result')
    try {
      const res = await call<JudgeResult>('runCode', { problemId: problem.id, language, sourceCode: code })
      setRunResult(res)
      setSubmitResult(null)
    } catch (err) {
      toast({
        title: 'Run failed',
        description: err instanceof Error ? err.message : 'The judge is unavailable right now.',
        tone: 'error',
      })
    } finally {
      setRunning(false)
    }
  }

  const handleSubmit = async () => {
    if (!problem) return
    setSubmitting(true)
    setTab('result')
    try {
      const res = await call<JudgeResult & { submissionId: string }>('submitSolution', {
        problemId: problem.id,
        language,
        sourceCode: code,
      })
      setSubmitResult(res)
      setRunResult(null)
      loadHistory(problem.id)
      toast({
        title: res.verdict,
        description: `${res.testsPassed}/${res.testsTotal} tests passed`,
        tone: res.verdict === 'Accepted' ? 'success' : 'error',
      })
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

  if (loading) return <LoadingBlock label="Loading problem…" />
  if (error) return <ErrorState message={error} />
  if (!problem) return null

  return (
    <div className="space-y-4">
      <Link to="/problems" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to problems
      </Link>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">#{problem.number}</span>
                <CardTitle className="text-lg">{problem.title}</CardTitle>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge tone={difficultyTone(problem.difficulty)}>{problem.difficulty}</Badge>
                {parseList(problem.topics).map((t) => (
                  <Badge key={t} tone="outline">
                    {t}
                  </Badge>
                ))}
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  Acceptance {acceptanceRate(problem.totalSubmissions, problem.acceptedSubmissions)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-card-foreground">
                {problem.description}
              </div>

              {examples.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-card-foreground">Examples</h3>
                  {examples.map((ex, i) => (
                    <div key={i} className="rounded-lg border border-border bg-muted/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Example {i + 1}
                      </p>
                      <div className="mt-2 space-y-1.5 font-mono text-xs">
                        <p>
                          <span className="text-muted-foreground">Input: </span>
                          <span className="text-foreground">{ex.input}</span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Output: </span>
                          <span className="text-foreground">{ex.output}</span>
                        </p>
                      </div>
                      {ex.explanation && (
                        <p className="mt-2 text-xs text-muted-foreground">{ex.explanation}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {problem.constraints && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-card-foreground">Constraints</h3>
                  <pre className="whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs text-foreground">
                    {problem.constraints}
                  </pre>
                </div>
              )}

              {samples.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-card-foreground">Sample tests</h3>
                  <div className="space-y-2">
                    {samples.map((c, i) => (
                      <div key={c.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Input {i + 1}</p>
                          <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-foreground">{c.input}</pre>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Expected</p>
                          <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-foreground">
                            {c.expectedOutput}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Limits: {problem.timeLimitMs} ms · {problem.memoryLimitMb} MB
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <CodeEditorPanel
            problemId={problem.id}
            starterCodeJson={problem.starterCode}
            language={language}
            onLanguageChange={setLanguage}
            code={code}
            onCodeChange={setCode}
            onRun={handleRun}
            onSubmit={handleSubmit}
            running={running}
            submitting={submitting}
          />

          <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
            {(['result', 'history'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  tab === t ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'result' ? 'Results' : `History (${history.length})`}
              </button>
            ))}
          </div>

          {tab === 'result' ? (
            <JudgeResultPanel
              result={submitResult ?? runResult}
              title={submitResult ? 'Submission result' : 'Sample test run'}
            />
          ) : history.length === 0 ? (
            <EmptyState title="No submissions yet" description="Your attempts on this problem will show here." />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5">Verdict</th>
                        <th className="px-4 py-2.5">Language</th>
                        <th className="px-4 py-2.5">Tests</th>
                        <th className="px-4 py-2.5">Runtime</th>
                        <th className="px-4 py-2.5">When</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {history.map((s) => (
                        <tr key={s.id}>
                          <td className="px-4 py-2.5">
                            <Badge tone={verdictTone(s.verdict)}>{s.verdict}</Badge>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">{s.language}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                            {s.testsPassed}/{s.testsTotal}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{s.runtimeMs} ms</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDateTime(s.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}