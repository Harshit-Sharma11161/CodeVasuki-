import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useDb } from '@/lib/pentoggle-db'
import { useFunction } from '@/lib/pentoggle-functions'
import { useToast } from '@/hooks/useToast'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LoadingBlock, ErrorState, EmptyState } from '@/components/ui/States'
import type { University, User } from '@/types/models'

const PAGE_SIZE = 20

export default function AdminUsersPage() {
  const { batch } = useDb()
  const { call } = useFunction()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(0)
  const [users, setUsers] = useState<(User & { university: University | null })[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState<{ user: User; action: 'role' | 'status' } | null>(null)
  const [busy, setBusy] = useState(false)

  const where = useMemo(() => {
    const clauses: Record<string, unknown>[] = []
    if (search.trim()) clauses.push({ name: { contains: search.trim() } })
    if (role) clauses.push({ role })
    if (clauses.length === 0) return {}
    return clauses.length === 1 ? clauses[0] : { AND: clauses }
  }, [search, role])

  const load = useCallback(
    (p: number) => {
      setLoading(true)
      setError('')
      batch([
        {
          model: 'User',
          action: 'findMany',
          args: {
            where,
            orderBy: { rating: 'desc' },
            take: PAGE_SIZE,
            skip: p * PAGE_SIZE,
            include: { university: true },
          },
        },
        { model: 'User', action: 'count', args: { where } },
      ])
        .then((res) => {
          const [list, count] = res as unknown as [
            { data: (User & { university: University | null })[] },
            { data: number },
          ]
          setUsers(list.data ?? [])
          setTotal(count.data ?? 0)
          setPage(p)
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Could not load users.'))
        .finally(() => setLoading(false))
    },
    [batch, where],
  )

  useEffect(() => {
    load(0)
  }, [load])

  const applyChange = async () => {
    if (!confirm) return
    setBusy(true)
    try {
      if (confirm.action === 'role') {
        await call<{ success: boolean }>('setUserRole', {
          userId: confirm.user.id,
          role: confirm.user.role === 'admin' ? 'student' : 'admin',
        })
      } else {
        await call<{ success: boolean }>('setUserStatus', {
          userId: confirm.user.id,
          status: confirm.user.status === 'active' ? 'suspended' : 'active',
        })
      }
      toast({ title: 'User updated', tone: 'success' })
      setConfirm(null)
      load(page)
    } catch (err) {
      toast({ title: 'Could not update user', description: err instanceof Error ? err.message : '', tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1)

  return (
    <div>
      <PageHeader title="Manage users" description={`${total} accounts registered.`} />

      <Card className="mb-4 p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
            <option value="">All roles</option>
            <option value="student">Student</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
      </Card>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load(page)} />
      ) : users.length === 0 ? (
        <EmptyState title="No users match these filters" />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[48rem] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">University</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <Link to={`/profile/${u.id}`} className="flex items-center gap-2 hover:text-primary">
                        <Avatar name={u.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{u.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.university?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{u.rating}</td>
                    <td className="px-4 py-3">
                      <Badge tone={u.role === 'admin' ? 'primary' : 'muted'}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.status === 'active' ? 'success' : 'destructive'}>{u.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setConfirm({ user: u, action: 'role' })}>
                          {u.role === 'admin' ? 'Make student' : 'Make admin'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={u.status === 'active' ? 'text-destructive' : 'text-success'}
                          onClick={() => setConfirm({ user: u, action: 'status' })}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Restore'}
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
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title="Confirm change"
        description={
          confirm?.action === 'role'
            ? `Change ${confirm.user.name}'s role to ${confirm.user.role === 'admin' ? 'student' : 'admin'}?`
            : `${confirm?.user.status === 'active' ? 'Suspend' : 'Restore'} ${confirm?.user.name}?`
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant={confirm?.action === 'status' && confirm.user.status === 'active' ? 'destructive' : 'default'}
              onClick={applyChange}
              loading={busy}
            >
              Confirm
            </Button>
          </>
        }
      />
    </div>
  )
}