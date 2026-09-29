import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useNavigate } from 'react-router-dom';
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
import LeagueMembersPage from './pages/LeagueMembersPage';
import LeagueLayout from './components/league/LeagueLayout';
import LeagueIndexRedirect from './components/league/LeagueIndexRedirect';
import DraftPage from './pages/DraftPage';
import DraftSetupPage from './pages/DraftSetupPage';
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
import { RouteErrorBoundary } from './components/ErrorBoundary';
import ToastContainer from './components/ToastContainer';
import { useNotificationSse } from './hooks/useNotificationSse';

const queryClient = new QueryClient();

function deepLinkPath(url: string): string {
  const parsed = new URL(url);
  // "pokefantasy://invite/TOKEN" → hostname="invite", pathname="/TOKEN" → "/invite/TOKEN"
  return `/${parsed.hostname}${parsed.pathname}`;
}

function GlobalNotifications() {
  useNotificationSse();
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

/** Todo lo que necesita estar dentro del router (navegación, ubicación) vive aquí. */
function RootLayout() {
  return (
    <>
      <ToastContainer />
      <DeepLinkHandler />
      <GlobalNotifications />
      <RouteErrorBoundary>
        <Outlet />
      </RouteErrorBoundary>
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/profile', element: <MyProfilePage /> },
          { path: '/leagues', element: <LeaguesPage /> },
          {
            path: '/leagues/:leagueId',
            element: <LeagueLayout />,
            children: [
              { index: true, element: <LeagueIndexRedirect /> },
              { path: 'members', element: <LeagueMembersPage /> },
              { path: 'pool', element: <PoolPage /> },
              { path: 'draft', element: <DraftPage /> },
              { path: 'draft/setup', element: <DraftSetupPage /> },
              { path: 'teams', element: <TeamsPage /> },
              { path: 'config', element: <LeagueConfigPage /> },
              { path: 'schedule', element: <SchedulePage /> },
              { path: 'tiers', element: <TierManagementPage /> },
              { path: 'activity', element: <ActivityPage /> },
              { path: 'standings', element: <StandingsPage /> },
              { path: 'players/:username', element: <PlayerProfilePage /> },
            ],
          },
          { path: '/invite/:token', element: <InvitePage /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  const authUsername = useAuthStore(state => state.username);

  useEffect(() => {
    if (authUsername && Capacitor.isNativePlatform()) {
      PushNotifications.register();
    }
  }, [authUsername]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
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
