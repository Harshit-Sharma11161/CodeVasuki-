import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { useAuth } from '@/lib/pentoggle-auth'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'

export default function VerifyEmailPendingPage() {
  const { resendVerification } = useAuth()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleResend = async () => {
    if (!email) return
    setBusy(true)
    try {
      await resendVerification(email)
      setSent(true)
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
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 inline-flex rounded-full bg-primary/10 p-3 text-primary">
            <MailCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a verification link{email ? ` to ${email}` : ''}. Click it to activate your account, then log
            in.
          </p>
          {email && (
            <Button className="mt-6" variant="outline" onClick={handleResend} loading={busy} disabled={sent}>
              {sent ? 'Verification email sent' : 'Resend verification email'}
            </Button>
          )}
          <p className="mt-6 text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:underline">
              Back to log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}