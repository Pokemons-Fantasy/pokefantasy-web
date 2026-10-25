import { useId, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { deleteAccount } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';
import Modal from './Modal';

interface DeleteAccountModalProps {
  onClose: () => void;
}

/**
 * Borrado de cuenta (RGPD art. 17). Pide la contraseña; mientras se borra no se puede cerrar. Si falla, el
 * error sale en un toast y el modal sigue abierto.
 */
export default function DeleteAccountModal({ onClose }: DeleteAccountModalProps) {
  const titleId = useId();
  const passwordId = useId();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const mutation = useMutation({
    mutationFn: () => deleteAccount(password),
    onSuccess: () => {
      queryClient.clear();
      useAuthStore.getState().accountDeleted();
      addToast('success', 'Cuenta borrada');
      navigate('/login', { replace: true });
    },
    onError: (error) => addToast('error', extractErrorMessage(error)),
  });

  return (
    <Modal
      labelledBy={titleId}
      onClose={onClose}
      canClose={!mutation.isPending}
      initialFocusRef={passwordRef}
      className="confirm-dialog"
    >
      <h2 id={titleId}>Borrar cuenta</h2>
      <p className="confirm-dialog-message">
        Se borrará tu cuenta y no se puede deshacer. Saldrás de todas tus ligas, tus Pokémon volverán al banquillo
        y en el historial aparecerás como «Usuario eliminado». Si eres el único admin de una liga, pasará a serlo
        el miembro más antiguo; si estás solo, la liga se borra.
      </p>
      <form onSubmit={(e) => { e.preventDefault(); if (password) mutation.mutate(); }}>
        <label htmlFor={passwordId}>Contraseña</label>
        <input
          ref={passwordRef}
          id={passwordId}
          type="password"
          className="search-input"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={mutation.isPending}
        />
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </button>
          <button type="submit" className="btn-danger" disabled={!password || mutation.isPending}>
            {mutation.isPending ? 'Borrando…' : 'Borrar mi cuenta'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
