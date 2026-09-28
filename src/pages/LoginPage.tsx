import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation, Link, type Location } from 'react-router-dom';
import { login } from '../api/auth';
import { getMyLeagues } from '../api/leagues';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';
import { isSessionExpired } from '../utils/session';

interface LocationState {
  from?: Location;
}

export const COOKIES_BLOCKED_MESSAGE =
  'Tu navegador está bloqueando las cookies de sesión. Permite las cookies de este sitio o prueba con otro navegador.';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from;
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const result = await login(username, password);
      try {
        // Comprueba que el navegador ha guardado la cookie antes de dar el login por bueno; si no, cada
        // petición daría 401 y se volvería al login en bucle. El resultado queda en caché para la home.
        await queryClient.fetchQuery({ queryKey: ['my-leagues'], queryFn: getMyLeagues, retry: false });
      } catch (err) {
        if (isSessionExpired(err)) throw new Error(COOKIES_BLOCKED_MESSAGE, { cause: err });
      }
      return result;
    },
    onSuccess: ({ username: loggedUsername }) => {
      setAuth(loggedUsername);
      navigate(from ?? '/', { replace: true });
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'Usuario o contraseña incorrectos')),
  });

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>PokeFantasy</h1>
          <p>Inicia sesión para continuar</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
          <label htmlFor="login-username" className="sr-only">Usuario</label>
          <input
            id="login-username"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          <label htmlFor="login-password" className="sr-only">Contraseña</label>
          <input
            id="login-password"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button className="btn-submit" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="auth-footer">¿No tienes cuenta? <Link to="/register" state={{ from }}>Regístrate</Link></p>
      </div>
    </div>
  );
}
