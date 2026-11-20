import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Plus, Pencil, Power, ListChecks } from 'lucide-react'
import { useDb } from '@/lib/pentoggle-db'
import { useFunction } from '@/lib/pentoggle-functions'
import { useToast } from '@/hooks/useToast'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Label, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LoadingBlock, ErrorState, EmptyState } from '@/components/ui/States'
import { DIFFICULTIES, difficultyTone } from '@/lib/constants'
import { parseList } from '@/lib/utils'
import type { Problem, TestCase } from '@/types/models'

const PAGE_SIZE = 20

type FormState = {
  id: string | null
  title: string
  slug: string
  difficulty: string
  topics: string
  description: string
  constraints: string
  examples: string
  timeLimitMs: number
  memoryLimitMb: number
}

const blankForm: FormState = {
  id: null,
  title: '',
  slug: '',
  difficulty: 'Easy',
  topics: 'Arrays',
  description: '',
  constraints: '',
  examples: '[{"input":"","output":""}]',
  timeLimitMs: 2000,
  memoryLimitMb: 256,
}

export default function AdminProblemsPage() {
  const { batch, query } = useDb()
  const { call } = useFunction()
  const { toast } = useToast()

  const [problems, setProblems] = useState<Problem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)

  const [casesFor, setCasesFor] = useState<Problem | null>(null)
  const [cases, setCases] = useState<TestCase[]>([])
  const [caseInput, setCaseInput] = useState('')
  const [caseOutput, setCaseOutput] = useState('')
  const [caseHidden, setCaseHidden] = useState(true)

  const load = useCallback(
    (p: number) => {
      setLoading(true)
      setError('')
      batch([
        {
          model: 'Problem',
          action: 'findMany',
          args: { orderBy: { number: 'asc' }, take: PAGE_SIZE, skip: p * PAGE_SIZE },
        },
        { model: 'Problem', action: 'count', args: {} },
      ])
        .then((res) => {
          const [list, count] = res as unknown as [{ data: Problem[] }, { data: number }]
          setProblems(list.data ?? [])
          setTotal(count.data ?? 0)
          setPage(p)
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Could not load problems.'))
        .finally(() => setLoading(false))
    },
    [batch],
  )

  useEffect(() => {
    load(0)
  }, [load])

  const loadCases = useCallback(
    (problemId: string) => {
      query<TestCase[]>('TestCase', 'findMany', {
        where: { problemId },
        orderBy: { orderIndex: 'asc' },
        take: 100,
      })
        .then((res) => setCases(res.data ?? []))
        .catch(() => setCases([]))
    },
    [query],
  )

  const openCreate = () => setForm({ ...blankForm })
  const openEdit = (p: Problem) =>
    setForm({
      id: p.id,
      title: p.title,
      slug: p.slug,
      difficulty: p.difficulty,
      topics: p.topics,
      description: p.description,
      constraints: p.constraints,
      examples: p.examples,
      timeLimitMs: p.timeLimitMs,
      memoryLimitMb: p.memoryLimitMb,
    })

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    try {
      await call<{ id: string }>('upsertProblem', form)
      toast({ title: form.id ? 'Problem updated' : 'Problem created', tone: 'success' })
      setForm(null)
      load(page)
    } catch (err) {
      toast({ title: 'Could not save', description: err instanceof Error ? err.message : '', tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (p: Problem) => {
    try {
      await call<{ success: boolean }>('setProblemActive', { problemId: p.id, isActive: !p.isActive })
      load(page)
    } catch (err) {
      toast({ title: 'Could not update', description: err instanceof Error ? err.message : '', tone: 'error' })
    }
  }

  const addCase = async () => {
    if (!casesFor || !caseInput.trim()) return
    try {
      await call<{ id: string }>('addTestCase', {
        problemId: casesFor.id,
        input: caseInput,
        expectedOutput: caseOutput,
        isHidden: caseHidden,
      })
      setCaseInput('')
      setCaseOutput('')
      loadCases(casesFor.id)
      toast({ title: 'Test case added', tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not add test case', description: err instanceof Error ? err.message : '', tone: 'error' })
    }
  }

  const removeCase = async (id: string) => {
    if (!casesFor) return
    await call<{ success: boolean }>('deleteTestCase', { testCaseId: id })
    loadCases(casesFor.id)
  }

  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1)

  return (
    <div>
      <PageHeader
        title="Manage problems"
        description={`${total} problems in the catalogue.`}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New problem
          </Button>
        }
      />

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load(page)} />
      ) : problems.length === 0 ? (
        <EmptyState title="No problems yet" description="Create the first problem to open the catalogue." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Difficulty</th>
                  <th className="px-4 py-3">Topics</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {problems.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{p.number}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{p.title}</td>
                    <td className="px-4 py-3">
                      <Badge tone={difficultyTone(p.difficulty)}>{p.difficulty}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {parseList(p.topics).slice(0, 2).join(', ')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={p.isActive ? 'success' : 'muted'}>{p.isActive ? 'Active' : 'Hidden'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setCasesFor(p)
                            loadCases(p.id)
                          }}
                          aria-label="Test cases"
                        >
                          <ListChecks className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => toggleActive(p)} aria-label="Toggle active">
                          <Power className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
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

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? 'Edit problem' : 'New problem'}
        wide
      >
        {form && (
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="two-sum"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Difficulty</Label>
                <Select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Topics (comma separated)</Label>
                <Input value={form.topics} onChange={(e) => setForm({ ...form, topics: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Time limit (ms)</Label>
                <Input
                  type="number"
                  value={form.timeLimitMs}
                  onChange={(e) => setForm({ ...form, timeLimitMs: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Memory limit (MB)</Label>
                <Input
                  type="number"
                  value={form.memoryLimitMb}
                  onChange={(e) => setForm({ ...form, memoryLimitMb: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={6}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Constraints</Label>
              <Textarea
                rows={3}
                value={form.constraints}
                onChange={(e) => setForm({ ...form, constraints: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Examples (JSON array of input/output/explanation)</Label>
              <Textarea
                rows={4}
                className="font-mono text-xs"
                value={form.examples}
                onChange={(e) => setForm({ ...form, examples: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Save problem
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={casesFor !== null}
        onClose={() => setCasesFor(null)}
        title={`Test cases — ${casesFor?.title ?? ''}`}
        wide
      >
        <div className="space-y-4">
          <div className="space-y-2">
            {cases.length === 0 ? (
              <p className="text-sm text-muted-foreground">No test cases yet. Add at least one visible sample.</p>
            ) : (
              cases.map((c, i) => (
                <div key={c.id} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Case {i + 1}</span>
                    <Badge tone={c.isHidden ? 'muted' : 'primary'}>{c.isHidden ? 'Hidden' : 'Sample'}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto text-destructive"
                      onClick={() => removeCase(c.id)}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <pre className="whitespace-pre-wrap rounded bg-muted p-2 font-mono text-xs">{c.input}</pre>
                    <pre className="whitespace-pre-wrap rounded bg-muted p-2 font-mono text-xs">
                      {c.expectedOutput}
                    </pre>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-sm font-medium text-foreground">Add a test case</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Textarea
                rows={3}
                placeholder="Input"
                className="font-mono text-xs"
                value={caseInput}
                onChange={(e) => setCaseInput(e.target.value)}
              />
              <Textarea
                rows={3}
                placeholder="Expected output"
                className="font-mono text-xs"
                value={caseOutput}
                onChange={(e) => setCaseOutput(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={caseHidden}
                onChange={(e) => setCaseHidden(e.target.checked)}
                className="h-4 w-4 accent-[rgb(var(--primary))]"
              />
              Hidden from students
            </label>
            <Button size="sm" onClick={addCase}>
              Add test case
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}