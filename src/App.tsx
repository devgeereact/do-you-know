import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

export function App(): JSX.Element {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/c/:slug" element={<CategoryPage />} />
            <Route path="/q/:slug" element={<QuizPage />} />
            <Route path="/play/:slug" element={<PlayPage />} />
            <Route path="/me" element={<MePage />} />
            <Route path="/leaderboards" element={<LeaderboardsPage />} />
            <Route path="/login" element={<LoginPage />} />
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
