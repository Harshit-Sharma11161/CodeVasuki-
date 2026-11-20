import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-4 text-center">
      <Logo />
      <h1 className="font-mono text-5xl font-black text-primary">404</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        That page does not exist. Head back to the dashboard and keep coding.
      </p>
      <Button asChild>
        <Link to="/dashboard">Go to dashboard</Link>
      </Button>
    </div>
  )
}