import { Badge } from '@/components/ui/Badge'
import { verdictTone } from '@/lib/constants'

export type JudgeCaseResult = {
  index: number
  passed: boolean
  input: string
  expectedOutput: string
  actualOutput: string
  runtimeMs: number
  memoryKb: number
  hidden: boolean
}

export type JudgeResult = {
  verdict: string
  message: string | null
  runtimeMs: number
  memoryKb: number
  testsPassed: number
  testsTotal: number
  cases: JudgeCaseResult[]
  mode: string
}

export default function JudgeResultPanel({
  result,
  title,
}: {
  result: JudgeResult | null
  title: string
}) {
  if (!result) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Run your code against the sample tests, or submit to judge against the full suite.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-semibold text-card-foreground">{title}</span>
        <Badge tone={verdictTone(result.verdict)}>{result.verdict}</Badge>
        <span className="font-mono text-xs text-muted-foreground">
          {result.testsPassed}/{result.testsTotal} tests
        </span>
        <span className="font-mono text-xs text-muted-foreground">{result.runtimeMs} ms</span>
        <span className="font-mono text-xs text-muted-foreground">{result.memoryKb} KB</span>
        {result.mode === 'mock' && (
          <Badge tone="warning" className="ml-auto">
            Simulated judge
          </Badge>
        )}
      </div>

      {result.message && (
        <pre className="mx-4 mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs text-foreground">
          {result.message}
        </pre>
      )}

      <div className="space-y-2 p-4">
        {result.cases.length === 0 && (
          <p className="text-sm text-muted-foreground">No per-test detail available for this run.</p>
        )}
        {result.cases.map((c) => (
          <div
            key={c.index}
            className={`rounded-lg border p-3 ${
              c.passed ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                Test {c.index + 1}
                {c.hidden ? ' (hidden)' : ''}
              </span>
              <Badge tone={c.passed ? 'success' : 'destructive'}>{c.passed ? 'Passed' : 'Failed'}</Badge>
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">{c.runtimeMs} ms</span>
            </div>
            {!c.hidden && (
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <Field label="Input" value={c.input} />
                <Field label="Expected" value={c.expectedOutput} />
                <Field label="Your output" value={c.actualOutput} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words rounded-md bg-background p-2 font-mono text-[11px] text-foreground">
        {value || '—'}
      </pre>
    </div>
  )
}