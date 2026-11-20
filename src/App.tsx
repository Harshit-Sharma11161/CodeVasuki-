import { Routes, Route } from 'react-router-dom'
import type { ReactNode } from 'react'
import { PentoggleAuthProvider, useAuth } from '@/lib/pentoggle-auth'
import { PentoggleDbProvider } from '@/lib/pentoggle-db'
import { PentoggleFunctionsProvider } from '@/lib/pentoggle-functions'
import { ThemeProvider } from '@/hooks/useTheme'
import { ToastProvider } from '@/hooks/useToast'

import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import AdminRoute from '@/components/AdminRoute'

import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import SignUpPage from '@/pages/SignUpPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import VerifyEmailPendingPage from '@/pages/VerifyEmailPendingPage'
import DashboardPage from '@/pages/DashboardPage'
import ProblemsPage from '@/pages/ProblemsPage'
import ProblemDetailPage from '@/pages/ProblemDetailPage'
import BattleLobbyPage from '@/pages/BattleLobbyPage'
import BattleRoomPage from '@/pages/BattleRoomPage'
import BattleResultPage from '@/pages/BattleResultPage'
import LeaderboardPage from '@/pages/LeaderboardPage'
import UniversityPage from '@/pages/UniversityPage'
import ProfilePage from '@/pages/ProfilePage'
import NotificationsPage from '@/pages/NotificationsPage'
import SettingsPage from '@/pages/SettingsPage'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import AdminProblemsPage from '@/pages/admin/AdminProblemsPage'
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import NotFoundPage from '@/pages/NotFoundPage'

function AppProviders({ children }: { children: ReactNode }) {
  const { accessToken, refresh } = useAuth()
  return (
    <PentoggleDbProvider accessToken={accessToken} onAuthRefresh={refresh}>
      <PentoggleFunctionsProvider accessToken={accessToken} onAuthRefresh={refresh}>
        {children}
      </PentoggleFunctionsProvider>
    </PentoggleDbProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PentoggleAuthProvider>
          <AppProviders>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPendingPage />} />

              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/problems" element={<ProblemsPage />} />
                <Route path="/problems/:slug" element={<ProblemDetailPage />} />
                <Route path="/battles" element={<BattleLobbyPage />} />
                <Route path="/battles/:id" element={<BattleRoomPage />} />
                <Route path="/battles/:id/result" element={<BattleResultPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/university" element={<UniversityPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/profile/:userId" element={<ProfilePage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />

                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminDashboardPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/problems"
                  element={
                    <AdminRoute>
                      <AdminProblemsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <AdminRoute>
                      <AdminUsersPage />
                    </AdminRoute>
                  }
                />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AppProviders>
        </PentoggleAuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}