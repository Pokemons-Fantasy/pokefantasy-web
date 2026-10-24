import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { linkShowdown, unlinkShowdown } from '../api/auth';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';

interface ShowdownAccountSectionProps {
  /** Cuenta vinculada (nombre canónico de Showdown); null o ausente = sin vincular. */
  showdownName?: string | null;
}

/** Vincular o desvincular la cuenta de Pokémon Showdown (en "Mi perfil"). */
export default function ShowdownAccountSection({ showdownName }: ShowdownAccountSectionProps) {
  const [name, setName] = useState('');
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const onChanged = () => {
    queryClient.invalidateQueries({ queryKey: ['me'] });
    // El nombre de Showdown sale en los miembros de todas las ligas.
    queryClient.invalidateQueries({ queryKey: ['league-detail'] });
  };

  const link = useMutation({
    mutationFn: () => linkShowdown(name.trim()),
    onSuccess: () => {
      onChanged();
      setName('');
      addToast('success', 'Cuenta de Showdown vinculada');
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'No se pudo vincular la cuenta')),
  });

  const unlink = useMutation({
    mutationFn: unlinkShowdown,
    onSuccess: () => {
      onChanged();
      addToast('success', 'Cuenta de Showdown desvinculada');
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'No se pudo desvincular la cuenta')),
  });

  if (showdownName) {
    return (
      <div className="card card-static showdown-account">
        <p>
          Cuenta vinculada: <strong>{showdownName}</strong>
        </p>
        <button className="btn-ghost" onClick={() => unlink.mutate()} disabled={unlink.isPending}>
          Desvincular
        </button>
      </div>
    );
  }

  return (
    <form
      className="card card-static showdown-account"
      onSubmit={(e) => { e.preventDefault(); if (name.trim()) link.mutate(); }}
      noValidate
    >
      <label htmlFor="showdown-name">Nombre en Showdown</label>
      <input
        id="showdown-name"
        className="search-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={18}
        autoComplete="off"
        aria-describedby="showdown-name-hint"
      />
      <p id="showdown-name-hint" className="field-hint">
        Tiene que ser una cuenta registrada en Showdown. Se usa para retar a tu rival e importar los resultados.
      </p>
      <button type="submit" className="btn-primary" disabled={!name.trim() || link.isPending}>
        Vincular
      </button>
    </form>
  );
}
