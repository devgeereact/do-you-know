import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { InstallPrompt } from '@/components/InstallPrompt';
import { UpdatePrompt } from '@/components/UpdatePrompt';
import { OfflineBanner } from '@/components/OfflineBanner';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { CategoryPage } from '@/pages/CategoryPage';
import { QuizPage } from '@/pages/QuizPage';
import { PlayPage } from '@/pages/PlayPage';
import { MePage } from '@/pages/MePage';
import { LeaderboardsPage } from '@/pages/LeaderboardsPage';
import { DailyPage } from '@/pages/DailyPage';
import { ChallengePage } from '@/pages/ChallengePage';
import { AvatarPage } from '@/pages/AvatarPage';
import { env } from '@/lib/env';

const AccountPage = lazy(() =>
  import('@/pages/AccountPage').then((m) => ({ default: m.AccountPage })),
);
const BackendPreviewPage = lazy(() =>
  import('@/pages/BackendPreviewPage').then((m) => ({ default: m.BackendPreviewPage })),
);

export function App(): JSX.Element {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={env.cpanelPreview ? <Navigate to="/preview" replace /> : <HomePage />}
            />
            <Route
              path="/preview"
              element={
                <Suspense fallback={<p role="status" className="p-6">Loading quizzes…</p>}>
                  <BackendPreviewPage />
                </Suspense>
              }
            />
            <Route path="/c/:slug" element={<CategoryPage />} />
            <Route path="/q/:slug" element={<QuizPage />} />
            <Route path="/play/:slug" element={<PlayPage />} />
            <Route path="/me" element={<MePage />} />
            <Route path="/me/avatar" element={<AvatarPage />} />
            <Route path="/leaderboards" element={<LeaderboardsPage />} />
            <Route path="/daily" element={<DailyPage />} />
            <Route path="/daily/play" element={<PlayPage kind="daily" />} />
            <Route path="/challenge/:code" element={<ChallengePage />} />
            <Route path="/challenge/:code/play" element={<PlayPage kind="challenge" />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/account"
              element={
                <Suspense
                  fallback={
                    <p role="status" className="p-6">
                      Loading account…
                    </p>
                  }
                >
                  <AccountPage />
                </Suspense>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>

          {/* Global PWA affordances */}
          <UpdatePrompt />
          <InstallPrompt />
          <OfflineBanner />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
