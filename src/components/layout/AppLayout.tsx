import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Code2,
  Swords,
  Trophy,
  GraduationCap,
  User as UserIcon,
  Bell,
  Settings as SettingsIcon,
  Shield,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/lib/pentoggle-auth'
import { useDb } from '@/lib/pentoggle-db'
import { useTheme } from '@/hooks/useTheme'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Logo } from '@/components/Logo'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/problems', label: 'Problems', icon: Code2 },
  { to: '/battles', label: 'Battles', icon: Swords },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/university', label: 'University', icon: GraduationCap },
  { to: '/profile', label: 'Profile', icon: UserIcon },
]

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const { profile } = useCurrentUser()
  const { query } = useDb()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => setOpen(false), [location.pathname])

  useEffect(() => {
    let cancelled = false
    if (!user?.id) return
    const load = () => {
      query<number>('Notification', 'count', { where: { userId: user.id, isRead: false } })
        .then((res) => {
          if (!cancelled) setUnread(res.data ?? 0)
        })
        .catch(() => undefined)
    }
    load()
    const t = window.setInterval(load, 30000)
    return () => {
      cancelled = true
      window.clearInterval(t)
    }
  }, [user?.id, query, location.pathname])

  const isAdmin = user?.role === 'admin'

  const navItems = (
    <>
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/profile'}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/12 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
      {isAdmin && (
        <>
          <div className="mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Admin
          </div>
          {[
            { to: '/admin', label: 'Overview' },
            { to: '/admin/problems', label: 'Problems' },
            { to: '/admin/users', label: 'Users' },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/12 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Shield className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-3 px-3 sm:px-5">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <Link to="/dashboard" className="flex items-center">
            <Logo />
          </Link>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {profile && (
              <div className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 sm:flex">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Rating</span>
                <span className="font-mono text-sm font-semibold text-primary">{profile.rating}</span>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Link to="/notifications" className="relative">
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </Button>
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
            <Link to="/settings">
              <Button variant="ghost" size="icon" aria-label="Settings">
                <SettingsIcon className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/profile" className="hidden sm:block">
              <Avatar name={profile?.name ?? 'Coder'} size="sm" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={async () => {
                await signOut()
                navigate('/')
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px]">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto border-r border-border/70 px-3 py-4 lg:block">
          <nav className="flex flex-col gap-1">{navItems}</nav>
        </aside>

        {open && (
          <div className="fixed inset-0 top-14 z-30 bg-foreground/30 lg:hidden" onClick={() => setOpen(false)}>
            <nav
              className="flex h-full w-64 flex-col gap-1 overflow-y-auto border-r border-border bg-card px-3 py-4"
              onClick={(e) => e.stopPropagation()}
            >
              {navItems}
            </nav>
          </div>
        )}

        <main className="min-w-0 flex-1 px-3 py-5 sm:px-5 sm:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}