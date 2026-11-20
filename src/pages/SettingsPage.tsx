import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Moon, Sun } from 'lucide-react'
import { useAuth } from '@/lib/pentoggle-auth'
import { useDb } from '@/lib/pentoggle-db'
import { useFunction } from '@/lib/pentoggle-functions'
import { useTheme } from '@/hooks/useTheme'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'
import type { University } from '@/types/models'

export default function SettingsPage() {
  const { signOut } = useAuth()
  const { profile, reload } = useCurrentUser()
  const { query } = useDb()
  const { call } = useFunction()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [universityId, setUniversityId] = useState('')
  const [universities, setUniversities] = useState<University[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (profile) {
      setName(profile.name)
      setUniversityId(profile.universityId ?? '')
    }
  }, [profile])

  useEffect(() => {
    query<University[]>('University', 'findMany', { orderBy: { name: 'asc' }, take: 50 })
      .then((res) => setUniversities(res.data ?? []))
      .catch(() => undefined)
  }, [query])

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await call<{ success: boolean }>('updateProfile', { name: name.trim(), universityId: universityId || null })
      toast({ title: 'Profile updated', tone: 'success' })
      reload()
    } catch (err) {
      toast({
        title: 'Could not save',
        description: err instanceof Error ? err.message : '',
        tone: 'error',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Settings" description="Manage your account and how CodeVasuki looks." />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="university">University</Label>
              <Select id="university" value={universityId} onChange={(e) => setUniversityId(e.target.value)}>
                <option value="">Not set</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={profile?.email ?? ''} readOnly disabled />
            </div>
            <Button type="submit" loading={busy}>
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              onClick={() => setTheme('light')}
              className="flex-1"
            >
              <Sun className="h-4 w-4" />
              Light
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              onClick={() => setTheme('dark')}
              className="flex-1"
            >
              <Moon className="h-4 w-4" />
              Dark
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Your preference is saved on this device and applies to the code editor too.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={async () => {
              await signOut()
              navigate('/')
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}