import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);

  const mutation = useMutation({
    mutationFn: () => register(username, password),
    onSuccess: () => navigate('/login'),
    onError: (err) => addToast('error', extractErrorMessage(err, 'El usuario ya existe o ha habido un error')),
  });

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>PokeFantasy</h1>
          <p>Crea tu cuenta para jugar</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
          <label htmlFor="register-username" className="sr-only">Usuario</label>
          <input
            id="register-username"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          <label htmlFor="register-password" className="sr-only">Contraseña</label>
          <input
            id="register-password"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <button className="btn-submit" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>
        {mutation.isSuccess && <p className="success">¡Cuenta creada! Redirigiendo...</p>}
        <p className="auth-footer">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
      </div>
    </div>
  );
}
