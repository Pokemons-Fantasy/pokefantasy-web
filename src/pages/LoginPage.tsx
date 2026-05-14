import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: (token) => {
      setAuth(token, username);
      navigate('/');
    },
  });

  return (
    <div className="auth-container">
      <h1>PokeFantasy</h1>
      <h2>Iniciar sesión</h2>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
        <input
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      {mutation.isError && <p className="error">Usuario o contraseña incorrectos</p>}
      <p>¿No tienes cuenta? <Link to="/register">Regístrate</Link></p>
    </div>
  );
}
