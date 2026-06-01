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
import TierManagementPage from './pages/TierManagementPage';
import ActivityPage from './pages/ActivityPage';
import StandingsPage from './pages/StandingsPage';
import PlayerProfilePage from './pages/PlayerProfilePage';
import MyProfilePage from './pages/MyProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/ToastContainer';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastContainer />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<MyProfilePage />} />
            <Route path="/leagues" element={<LeaguesPage />} />
            <Route path="/leagues/:leagueId" element={<LeagueDetailPage />} />
            <Route path="/leagues/:leagueId/pool" element={<PoolPage />} />
            <Route path="/leagues/:leagueId/draft" element={<DraftPage />} />
            <Route path="/leagues/:leagueId/teams" element={<TeamsPage />} />
            <Route path="/leagues/:leagueId/config" element={<LeagueConfigPage />} />
            <Route path="/leagues/:leagueId/schedule" element={<SchedulePage />} />
            <Route path="/leagues/:leagueId/tiers" element={<TierManagementPage />} />
            <Route path="/leagues/:leagueId/activity" element={<ActivityPage />} />
            <Route path="/leagues/:leagueId/standings" element={<StandingsPage />} />
            <Route path="/leagues/:leagueId/players/:username" element={<PlayerProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <div style={{
        position: 'fixed',
        bottom: '0.6rem',
        right: '1rem',
        fontSize: '0.7rem',
        color: 'var(--text-3)',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 9999,
      }}>
        v{__APP_VERSION__}
      </div>
    </QueryClientProvider>
  );
}
