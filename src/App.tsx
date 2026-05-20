import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import PoolPage from './pages/PoolPage';
import LeaguesPage from './pages/LeaguesPage';
import LeagueDetailPage from './pages/LeagueDetailPage';
import DraftPage from './pages/DraftPage';
import TeamsPage from './pages/TeamsPage';
import LeagueConfigPage from './pages/LeagueConfigPage';
import SchedulePage from './pages/SchedulePage';
import ProtectedRoute from './components/ProtectedRoute';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/leagues" element={<LeaguesPage />} />
            <Route path="/leagues/:leagueId" element={<LeagueDetailPage />} />
            <Route path="/leagues/:leagueId/pool" element={<PoolPage />} />
            <Route path="/leagues/:leagueId/draft" element={<DraftPage />} />
            <Route path="/leagues/:leagueId/teams" element={<TeamsPage />} />
            <Route path="/leagues/:leagueId/config" element={<LeagueConfigPage />} />
            <Route path="/leagues/:leagueId/schedule" element={<SchedulePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
