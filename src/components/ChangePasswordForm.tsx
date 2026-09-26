import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { changePassword } from '../api/auth';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';
import { passwordError, PASSWORD_MIN_LENGTH } from '../utils/registration';

/** Formulario plegable de cambio de contraseña (en "Mi perfil"). */
export default function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const addToast = useToastStore((s) => s.addToast);

  const nextError = passwordError(next)
    ?? (next && current && next === current ? 'Debe ser distinta de la actual.' : null);
  const confirmError = confirm && confirm !== next ? 'No coincide con la contraseña nueva.' : null;
  const canSubmit = !!current && !!next && !!confirm && !nextError && !confirmError;

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); };

  const mutation = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: () => {
      addToast('success', 'Contraseña cambiada. Se ha cerrado la sesión en tus otros dispositivos.');
      reset();
      setOpen(false);
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'No se pudo cambiar la contraseña')),
  });

  if (!open) {
    return (
      <button className="btn-ghost" onClick={() => setOpen(true)}>
        🔑 Cambiar contraseña
      </button>
    );
  }

  return (
    <form
      className="password-form card card-static animate-in"
      onSubmit={(e) => { e.preventDefault(); if (canSubmit) mutation.mutate(); }}
      noValidate
    >
      <label htmlFor="pw-current">Contraseña actual</label>
      <input
        id="pw-current"
        type="password"
        className="search-input"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        autoComplete="current-password"
      />

      <label htmlFor="pw-new">Contraseña nueva</label>
      <input
        id="pw-new"
        type="password"
        className="search-input"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        autoComplete="new-password"
        aria-invalid={!!nextError}
        aria-describedby="pw-new-hint"
      />
      <p id="pw-new-hint" className={nextError ? 'field-hint field-hint-error' : 'field-hint'}>
        {nextError ?? `Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`}
      </p>

      <label htmlFor="pw-confirm">Repite la contraseña nueva</label>
      <input
        id="pw-confirm"
        type="password"
        className="search-input"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
        aria-invalid={!!confirmError}
        aria-describedby="pw-confirm-hint"
      />
      <p id="pw-confirm-hint" className={confirmError ? 'field-hint field-hint-error' : 'field-hint'}>
        {confirmError ?? ' '}
      </p>

      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={() => { reset(); setOpen(false); }}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={!canSubmit || mutation.isPending}>
          {mutation.isPending ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </div>
    </form>
  );
}
