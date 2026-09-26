import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';
import { passwordError, usernameError, PASSWORD_MIN_LENGTH } from '../utils/registration';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);

  const userError = usernameError(username);
  const passError = passwordError(password);
  const canSubmit = !!username && !!password && !userError && !passError;

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
        <form onSubmit={(e) => { e.preventDefault(); if (canSubmit) mutation.mutate(); }} noValidate>
          <label htmlFor="register-username" className="sr-only">Usuario</label>
          <input
            id="register-username"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            aria-invalid={!!userError}
            aria-describedby="register-username-hint"
          />
          <p id="register-username-hint" className={userError ? 'field-hint field-hint-error' : 'field-hint'}>
            {userError ?? '3-20 caracteres: letras, números, "_" o "-".'}
          </p>
          <label htmlFor="register-password" className="sr-only">Contraseña</label>
          <input
            id="register-password"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            aria-invalid={!!passError}
            aria-describedby="register-password-hint"
          />
          <p id="register-password-hint" className={passError ? 'field-hint field-hint-error' : 'field-hint'}>
            {passError ?? `Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`}
          </p>
          <button className="btn-submit" type="submit" disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>
        {mutation.isSuccess && <p className="success">¡Cuenta creada! Redirigiendo...</p>}
        <p className="auth-footer">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
      </div>
    </div>
  );
}
