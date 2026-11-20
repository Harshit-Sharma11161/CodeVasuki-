import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Swords, Code2, Trophy, GraduationCap, Zap, ShieldCheck, Sun, Moon } from 'lucide-react'
import { useDb } from '@/lib/pentoggle-db'
import { useAuth } from '@/lib/pentoggle-auth'
import { useTheme } from '@/hooks/useTheme'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function LandingPage() {
  const { query, batch } = useDb()
  const { user } = useAuth()
  const { theme, toggle } = useTheme()
  const [stats, setStats] = useState<{ solved: number; battles: number; coders: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    batch([
      { model: 'Submission', action: 'count', args: { where: { verdict: 'Accepted' } } },
      { model: 'Battle', action: 'count', args: {} },
      { model: 'User', action: 'count', args: { where: { status: 'active' } } },
    ])
      .then((res) => {
        const [a, b, c] = res as unknown as [{ data: number }, { data: number }, { data: number }]
        if (!cancelled) {
          setStats({ solved: a.data ?? 0, battles: b.data ?? 0, coders: c.data ?? 0 })
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [batch, query])

  const statList = [
    { value: stats ? `${stats.solved}+` : '—', label: 'Problems Solved' },
    { value: stats ? `${stats.battles}+` : '—', label: 'Battles Fought' },
    { value: stats ? `${stats.coders}+` : '—', label: 'Active Coders' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {user ? (
              <Button asChild size="sm">
                <Link to="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgb(var(--primary)/0.14),transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
          <Badge tone="primary" className="mb-5">
            <GraduationCap className="h-3 w-3" />
            Built for GLA University coders
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            Code. Compete. <span className="text-primary">Conquer.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Solve algorithmic problems in a full online editor, then take an opponent head-on in a timed 1v1
            coding battle. Every win moves your rating, your university rank, and your place on the global board.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to={user ? '/problems' : '/signup'}>
                <Code2 className="h-4 w-4" />
                Start Coding
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to={user ? '/battles' : '/signup'}>
                <Swords className="h-4 w-4" />
                Enter Battle
              </Link>
            </Button>
          </div>

          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {statList.map((s) => (
              <Card key={s.label} className="p-5">
                <p className="font-mono text-3xl font-bold text-primary">{s.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Everything a competitive coder needs
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Code2,
              title: 'Problem library',
              body: 'Browse problems by topic, difficulty and solved status. Write solutions in Python, JavaScript, Java, C++ or C.',
            },
            {
              icon: Swords,
              title: '1v1 coding battles',
              body: 'Get matched with a coder near your rating, receive the same problem, and race to a correct, efficient solution.',
            },
            {
              icon: Trophy,
              title: 'Elo-style ratings',
              body: 'Every battle settles on the server and moves your rating. Track the full history of gains and losses.',
            },
            {
              icon: GraduationCap,
              title: 'University rankings',
              body: 'See where you stand inside GLA University and how your campus stacks up on the global board.',
            },
            {
              icon: Zap,
              title: 'Instant verdicts',
              body: 'Run against sample tests before you commit, then submit for a full judge run with runtime and memory detail.',
            },
            {
              icon: ShieldCheck,
              title: 'Server-decided results',
              body: 'Timers, matchmaking, scoring and rating changes are all computed on the server — never in the browser.',
            },
          ].map((f) => (
            <Card key={f.title} className="p-5">
              <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-card-foreground">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-muted/40">
        <div className="mx-auto max-w-4xl px-4 py-14">
          <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">How a battle works</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              'Join the queue — you are matched with a coder inside your rating band.',
              'The server picks one problem and starts a synced 30-minute clock for both players.',
              'Solve and submit. Correctness comes first, then speed, efficiency and attempts.',
              'The server scores both sides, declares the winner and applies the Elo change.',
            ].map((step, i) => (
              <li key={step} className="flex gap-3 rounded-xl border border-border bg-card p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <span className="text-sm text-card-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Your rating starts at 1200. Where it goes is up to you.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Create an account with your GLA University email and take your first battle today.
        </p>
        <Button asChild size="lg" className="mt-7">
          <Link to={user ? '/dashboard' : '/signup'}>{user ? 'Go to dashboard' : 'Create your account'}</Link>
        </Button>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 sm:flex-row">
          <Logo />
          <p className="text-xs text-muted-foreground">
            CodeVasuki — Code. Compete. Conquer. Built for the GLA University coding community.
          </p>
        </div>
      </footer>
    </div>
  )
}