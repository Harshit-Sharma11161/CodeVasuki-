import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { useAuth } from '@/lib/pentoggle-auth'
import { useDb } from '@/lib/pentoggle-db'
import { useFunction } from '@/lib/pentoggle-functions'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingBlock, EmptyState, ErrorState } from '@/components/ui/States'
import { formatDateTime } from '@/lib/utils'
import type { Notification } from '@/types/models'

export default function NotificationsPage() {
  const { user } = useAuth()
  const { query } = useDb()
  const { call } = useFunction()
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    const uid = user?.id
    if (!uid) return
    setLoading(true)
    setError('')
    query<Notification[]>('Notification', 'findMany', {
      where: { userId: uid },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
      .then((res) => setItems(res.data ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load notifications.'))
      .finally(() => setLoading(false))
  }, [query, user?.id])

  useEffect(() => {
    load()
  }, [load])

  const markAll = async () => {
    setBusy(true)
    try {
      await call<{ success: boolean }>('markNotificationsRead', { all: true })
      load()
    } finally {
      setBusy(false)
    }
  }

  const markOne = async (id: string) => {
    await call<{ success: boolean }>('markNotificationsRead', { notificationId: id })
    setItems((list) => list.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
  }

  const unread = items.filter((n) => !n.isRead).length

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={unread > 0 ? `${unread} unread` : 'You are all caught up.'}
        actions={
          unread > 0 ? (
            <Button variant="outline" onClick={markAll} loading={busy}>
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Battle results, rating changes and announcements will appear here."
          icon={<Bell className="h-7 w-7" />}
        />
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const body = (
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-border' : 'bg-primary'}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    {!n.isRead && <Badge tone="primary">New</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                </div>
              </div>
            )
            return (
              <Card key={n.id} className={n.isRead ? undefined : 'border-primary/30'}>
                <CardContent className="p-4">
                  {n.link ? (
                    <Link to={n.link} onClick={() => !n.isRead && markOne(n.id)} className="block">
                      {body}
                    </Link>
                  ) : (
                    <button onClick={() => !n.isRead && markOne(n.id)} className="w-full text-left">
                      {body}
                    </button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}