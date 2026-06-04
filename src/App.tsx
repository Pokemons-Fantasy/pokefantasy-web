import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { App as CapApp } from '@capacitor/app';
import { useAuthStore } from './store/authStore';
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
import InvitePage from './pages/InvitePage';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/ToastContainer';
import { useNotificationPoller } from './hooks/useNotificationPoller';

const queryClient = new QueryClient();

function deepLinkPath(url: string): string {
  const parsed = new URL(url);
  // "pokefantasy://invite/TOKEN" → hostname="invite", pathname="/TOKEN" → "/invite/TOKEN"
  return `/${parsed.hostname}${parsed.pathname}`;
}

function GlobalNotifications() {
  useNotificationPoller();
  return null;
}

function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const sub = CapApp.addListener('appUrlOpen', (event) => {
      navigate(deepLinkPath(event.url));
    });

    CapApp.getLaunchUrl().then((result) => {
      if (result?.url?.startsWith('pokefantasy://')) {
        navigate(deepLinkPath(result.url));
      }
    });

    return () => { sub.then(h => h.remove()); };
  }, [navigate]);

  return null;
}

export default function App() {
  const authToken = useAuthStore(state => state.token);

  useEffect(() => {
    if (authToken && Capacitor.isNativePlatform()) {
      PushNotifications.register();
    }
  }, [authToken]);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastContainer />
      <BrowserRouter>
        <DeepLinkHandler />
        <GlobalNotifications />
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
            <Route path="/invite/:token" element={<InvitePage />} />
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
