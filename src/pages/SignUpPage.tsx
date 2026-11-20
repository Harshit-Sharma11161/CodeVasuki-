import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/pentoggle-auth'
import { useDb } from '@/lib/pentoggle-db'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'
import type { University } from '@/types/models'

export default function SignUpPage() {
  const { user, loading, signUp } = useAuth()
  const { query } = useDb()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [universityId, setUniversityId] = useState('')
  const [universities, setUniversities] = useState<University[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true })
  }, [user, loading, navigate])

  useEffect(() => {
    let cancelled = false
    query<University[]>('University', 'findMany', { orderBy: { name: 'asc' }, take: 50 })
      .then((res) => {
        if (cancelled) return
        const list = res.data ?? []
        setUniversities(list)
        if (list.length && !universityId) setUniversityId(list[0].id)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    if (!universityId) {
      setError('Select your university to continue.')
      return
    }
    setBusy(true)
    try {
      const result = await signUp({
        email: email.trim(),
        password,
        name: name.trim(),
        universityId,
      })
      if (result?.requiresVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`)
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="p-4">
        <Link to="/">
          <Logo />
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create your CodeVasuki account</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Start at rating 1200 and climb your university board.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="university">University</Label>
              <Select
                id="university"
                value={universityId}
                onChange={(e) => setUniversityId(e.target.value)}
                required
              >
                {universities.length === 0 && <option value="">Loading…</option>}
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" loading={busy}>
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}