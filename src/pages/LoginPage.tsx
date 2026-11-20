import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/pentoggle-auth'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { LoadingBlock } from '@/components/ui/States'

export default function LoginPage() {
  const { user, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true })
  }, [user, loading, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn({ email: email.trim(), password })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign you in. Check your details and try again.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingBlock />
      </div>
    )
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Log in to CodeVasuki</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Continue solving problems and entering battles.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" loading={busy}>
              Log in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here?{' '}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}