import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { declareLineup, type Lineup, type TeamSheet } from '../../api/leagues';
import type { DraftPick } from '../../api/pokemons';
import { useToastStore } from '../../store/toastStore';
import { extractErrorMessage } from '../../utils/errorMessage';
import { lineupSize } from '../../utils/lineup';
import { spriteUrl } from '../../utils/sprites';

interface LineupModalProps {
  leagueId: string;
  matchId: string;
  /** Mi equipo actual (picks del draft). */
  myPicks: DraftPick[];
  /** La alineación que ya envié, si la hay (se puede cambiar hasta que el rival envíe la suya). */
  current?: Lineup | null;
  teamSheet: TeamSheet;
  onClose: () => void;
}

/** Elegir los Pokémon del partido. El backend valida periodo, propiedad y tamaño; aquí solo se guía. */
export default function LineupModal({ leagueId, matchId, myPicks, current, teamSheet, onClose }: LineupModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const size = lineupSize(myPicks.length);
  const open = teamSheet === 'OPEN';
  const [selected, setSelected] = useState<string[]>(current?.pokemonNames ?? []);
  const [pasteUrl, setPasteUrl] = useState(current?.pasteUrl ?? '');

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previous?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: () => declareLineup(leagueId, matchId, selected, open ? pasteUrl.trim() : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', leagueId] });
      addToast('success', 'Alineación enviada');
      onClose();
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'No se pudo enviar la alineación')),
  });

  const urlOk = !open || pasteUrl.trim().startsWith('https://');
  const canSubmit = size > 0 && selected.length === size && urlOk && !mutation.isPending;

  function toggle(name: string) {
    setSelected((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={dialogRef}
        className="modal animate-in-fast lineup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <h2 id={titleId}>Declarar alineación</h2>
        <p className="field-hint">
          Tu rival no la verá hasta que los dos la hayáis enviado. Después no se puede cambiar.
        </p>
        {size === 0
          ? <p className="field-hint field-hint-error">No tienes Pokémon para declarar.</p>
          : <p className="lineup-count" aria-live="polite">{selected.length} de {size}</p>}

        <div className="lineup-grid">
          {myPicks.map((p) => {
            const checked = selected.includes(p.pokemonName);
            const id = `lineup-${p.pokemonName}`;
            return (
              <label key={p.pokemonName} htmlFor={id} className={`lineup-option${checked ? ' selected' : ''}`}>
                <input
                  id={id}
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && selected.length >= size}
                  onChange={() => toggle(p.pokemonName)}
                />
                <img src={spriteUrl(p.pokemonId)} alt={p.pokemonName} width={56} height={56} loading="lazy" />
              </label>
            );
          })}
        </div>

        {open && (
          <div className="lineup-paste">
            <label htmlFor="lineup-paste-url">Enlace a tu equipo</label>
            <input
              id="lineup-paste-url"
              type="url"
              className="search-input"
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              placeholder="https://pokepast.es/..."
              aria-invalid={!!pasteUrl && !urlOk}
            />
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn-primary" disabled={!canSubmit} onClick={() => mutation.mutate()}>
            Enviar alineación
          </button>
        </div>
      </div>
    </div>
  );
}
