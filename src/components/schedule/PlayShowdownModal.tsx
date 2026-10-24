import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clipboard } from '@capacitor/clipboard';
import type { LeagueSettings } from '../../api/leagues';
import {
  BATTLE_DEFAULTS, challengeCommand, SHOWDOWN_FORMAT_NAMES, SHOWDOWN_PLAY_URL, showdownTeamText,
} from '../../utils/showdown';

interface PlayShowdownModalProps {
  /** Username del rival en la liga. */
  rival: string;
  myShowdownName?: string | null;
  rivalShowdownName?: string | null;
  settings: Partial<LeagueSettings>;
  /** Mis Pokémon, para pegarlos en el Teambuilder. */
  myPokemonNames: string[];
  onClose: () => void;
}

/**
 * Cómo jugar el partido en Showdown: el reto con las reglas de la liga, mi equipo para importarlo y los
 * pasos. Desde fuera no se puede crear el combate: lo lanza un jugador y lo acepta el otro.
 */
export default function PlayShowdownModal({
  rival, myShowdownName, rivalShowdownName, settings, myPokemonNames, onClose,
}: PlayShowdownModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<'challenge' | 'team' | null>(null);

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

  const canChallenge = !!myShowdownName && !!rivalShowdownName;
  const command = rivalShowdownName ? challengeCommand(rivalShowdownName, settings) : '';
  const gameType = settings.battleGameType ?? BATTLE_DEFAULTS.battleGameType;
  const picked = settings.pickedTeamSize ?? BATTLE_DEFAULTS.pickedTeamSize;

  function copy(text: string, what: 'challenge' | 'team') {
    Clipboard.write({ string: text }).then(() => {
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={dialogRef}
        className="modal animate-in-fast play-showdown"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <h2 id={titleId}>Jugar en Showdown</h2>

        {!myShowdownName && (
          <p className="field-hint field-hint-error">
            <Link to="/profile">Vincula tu cuenta de Showdown en tu perfil.</Link>
          </p>
        )}
        {!rivalShowdownName && (
          <p className="field-hint field-hint-error">{rival} no ha vinculado su cuenta de Showdown.</p>
        )}

        {canChallenge && (
          <div className="play-showdown-command">
            <code>{command}</code>
            <button type="button" className="btn-primary" onClick={() => copy(command, 'challenge')}>
              {copied === 'challenge' ? '✓ Copiado' : 'Copiar reto'}
            </button>
          </div>
        )}

        <ol className="play-showdown-steps">
          <li>En Showdown, abre el Teambuilder, crea un equipo nuevo y pega tu equipo con «Import from text».</li>
          <li>
            Completa movimientos, objetos, habilidades y estadísticas, y elige el formato {SHOWDOWN_FORMAT_NAMES[gameType]}.
          </li>
          <li>Quien reta pega el reto en el chat de Showdown y elige su equipo; el rival elige el suyo al aceptar.</li>
          {picked < 6 && <li>En el Team Preview, cada uno elige sus {picked} Pokémon.</li>}
        </ol>

        <p className="field-hint">
          Al terminar cada partida, pulsa «Upload and share replay» en Showdown: sin replay no se podrá importar el
          resultado.
        </p>

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cerrar</button>
          <button type="button" className="btn-ghost" onClick={() => copy(showdownTeamText(myPokemonNames), 'team')}>
            {copied === 'team' ? '✓ Copiado' : 'Copiar mi equipo'}
          </button>
          <a className="btn-primary" href={SHOWDOWN_PLAY_URL} target="_blank" rel="noopener noreferrer">
            Abrir Showdown
          </a>
        </div>
      </div>
    </div>
  );
}
