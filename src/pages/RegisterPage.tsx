import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => register(username, password),
    onSuccess: () => navigate('/login'),
  });

  return (
    <div className="auth-container">
      <h1>PokeFantasy</h1>
      <h2>Crear cuenta</h2>
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
          {mutation.isPending ? 'Registrando...' : 'Registrarse'}
        </button>
      </form>
      {mutation.isError && <p className="error">El usuario ya existe o ha habido un error</p>}
      {mutation.isSuccess && <p className="success">¡Cuenta creada! Redirigiendo...</p>}
      <p>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
    </div>
  );
}
