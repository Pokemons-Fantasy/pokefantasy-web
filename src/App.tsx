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
import DocumentTitle, { type TitleHandle } from './components/DocumentTitle';
import { resumeWebPush } from './push/webPush';

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

/** Al abrir la web o entrar: si este usuario tenía los avisos web activados, se vuelve a registrar el token. */
function WebPushResume() {
  const username = useAuthStore((s) => s.username);
  useEffect(() => {
    if (!username || Capacitor.isNativePlatform()) return;
    resumeWebPush(username).catch(() => {});
  }, [username]);
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
      <WebPushResume />
      <DocumentTitle />
      <RouteErrorBoundary>
        <Outlet />
      </RouteErrorBoundary>
    </>
  );
}

/** Sección en el título de la pestaña (DocumentTitle). */
const title = (value: TitleHandle['title']): TitleHandle => ({ title: value });

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/login', handle: title('Entrar'), element: <LoginPage /> },
      { path: '/register', handle: title('Crear cuenta'), element: <RegisterPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/', handle: title('Inicio'), element: <HomePage /> },
          { path: '/profile', handle: title('Mi perfil'), element: <MyProfilePage /> },
          { path: '/leagues', handle: title('Mis ligas'), element: <LeaguesPage /> },
          {
            path: '/leagues/:leagueId',
            element: <LeagueLayout />,
            children: [
              { index: true, element: <LeagueIndexRedirect /> },
              { path: 'members', handle: title('Miembros'), element: <LeagueMembersPage /> },
              { path: 'pool', handle: title('Pool'), element: <PoolPage /> },
              { path: 'draft', handle: title('Draft'), element: <DraftPage /> },
              { path: 'draft/setup', handle: title('Preparar draft'), element: <DraftSetupPage /> },
              { path: 'teams', handle: title('Equipos'), element: <TeamsPage /> },
              { path: 'config', handle: title('Configuración'), element: <LeagueConfigPage /> },
              { path: 'schedule', handle: title('Calendario'), element: <SchedulePage /> },
              { path: 'tiers', handle: title('Gestionar tiers'), element: <TierManagementPage /> },
              { path: 'activity', handle: title('Actividad'), element: <ActivityPage /> },
              { path: 'standings', handle: title('Clasificación'), element: <StandingsPage /> },
              { path: 'players/:username', handle: title((params) => params.username ?? 'Jugador'), element: <PlayerProfilePage /> },
            ],
          },
          { path: '/invite/:token', handle: title('Invitación'), element: <InvitePage /> },
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
    </QueryClientProvider>
  );
}
