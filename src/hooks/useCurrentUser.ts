import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/pentoggle-auth'
import { useDb } from '@/lib/pentoggle-db'
import type { University, User } from '@/types/models'

type Result = {
  profile: (User & { university: University | null }) | null
  loading: boolean
  reload: () => void
}

export function useCurrentUser(): Result {
  const { user } = useAuth()
  const { query } = useDb()
  const [profile, setProfile] = useState<(User & { university: University | null }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    const uid = user?.id
    if (!uid) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    query<(User & { university: University | null }) | null>('User', 'findUnique', {
      where: { id: uid },
      include: { university: true },
    })
      .then((res) => {
        if (!cancelled) setProfile(res.data ?? null)
      })
      .catch(() => {
        if (!cancelled) setProfile(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id, query, nonce])

  return { profile, loading, reload }
}