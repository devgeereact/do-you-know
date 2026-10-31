import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { SessionProvider } from '@/context/SessionContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppLayout } from '@/components/AppLayout';
import { InstallPrompt } from '@/components/InstallPrompt';
import { UpdatePrompt } from '@/components/UpdatePrompt';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SmoothScroll } from '@/components/motion/SmoothScroll';
import { HomePage } from '@/pages/HomePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { CategoryPage } from '@/pages/CategoryPage';
import { QuizPage } from '@/pages/QuizPage';
import { PlayPage } from '@/pages/PlayPage';
import { MePage } from '@/pages/MePage';
import { LeaderboardsPage } from '@/pages/LeaderboardsPage';
import { DailyPage } from '@/pages/DailyPage';
import { ChallengePage } from '@/pages/ChallengePage';
import { AvatarPage } from '@/pages/AvatarPage';
import { HowToPlayPage } from '@/pages/HowToPlayPage';
import { AboutPage } from '@/pages/AboutPage';
import { ContactPage } from '@/pages/ContactPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { TermsPage } from '@/pages/TermsPage';

const AccountPage = lazy(() =>
  import('@/pages/AccountPage').then((m) => ({ default: m.AccountPage })),
);

const AdminApp = lazy(() =>
  import('@/pages/admin/AdminApp').then((m) => ({ default: m.AdminApp })),
);

export function App(): JSX.Element {
  return (
    <ThemeProvider>
      <SessionProvider>
        <BrowserRouter>
          <SmoothScroll />
          <Routes>
            {/* Browse pages share the header, footer and phone tab bar. */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/c/:slug" element={<CategoryPage />} />
              <Route path="/q/:slug" element={<QuizPage />} />
              <Route path="/daily" element={<DailyPage />} />
              <Route path="/leaderboards" element={<LeaderboardsPage />} />
              <Route path="/challenge/:code" element={<ChallengePage />} />
              <Route path="/me" element={<MePage />} />
              <Route path="/me/avatar" element={<AvatarPage />} />
              <Route path="/me/settings" element={<SettingsPage />} />
              <Route path="/how-to-play" element={<HowToPlayPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route
                path="/account"
                element={
                  <Suspense
                    fallback={
                      <p role="status" className="px-4 py-16 text-center text-content-muted">
                        Loading account…
                      </p>
                    }
                  >
                    <AccountPage />
                  </Suspense>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* Play screens are full focus: their own Leave link, no site chrome. */}
            <Route path="/play/:slug" element={<PlayPage />} />
            <Route path="/daily/play" element={<PlayPage kind="daily" />} />
            <Route path="/challenge/:code/play" element={<PlayPage kind="challenge" />} />

            {/* The Studio has its own full-screen shell, outside the site chrome and page-enter motion. */}
            <Route
              path="/admin/*"
              element={
                <Suspense
                  fallback={
                    <p role="status" className="px-4 py-16 text-center">
                      Loading…
                    </p>
                  }
                >
                  <AdminApp />
                </Suspense>
              }
            />
            <Route path="/preview" element={<Navigate to="/" replace />} />
            <Route path="/login" element={<Navigate to="/account" replace />} />
            <Route path="/dashboard" element={<Navigate to="/me/settings" replace />} />
          </Routes>

          {/* Global PWA affordances */}
          <UpdatePrompt />
          <InstallPrompt />
          <OfflineBanner />
        </BrowserRouter>
      </SessionProvider>
    </ThemeProvider>
  );
}
