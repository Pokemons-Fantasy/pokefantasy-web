import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation, Link, type Location } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';

interface LocationState {
  from?: Location;
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from;

  const mutation = useMutation({
    mutationFn: () => login(username, password),
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
          <input
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          <input
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
        <p className="auth-footer">¿No tienes cuenta? <Link to="/register">Regístrate</Link></p>
      </div>
    </div>
  );
}
