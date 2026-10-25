import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clipboard } from '@capacitor/clipboard';
import type { LeagueSettings } from '../../api/leagues';
import { useToastStore } from '../../store/toastStore';
import Modal from '../Modal';
import {
  BATTLE_DEFAULTS, challengeCommand, SHOWDOWN_FORMAT_NAMES, SHOWDOWN_PLAY_URL, showdownTeamText,
} from '../../utils/showdown';

type Copyable = 'challenge' | 'team';

interface PlayShowdownModalProps {
  /** Username del rival en la liga. */
  rival: string;
  myShowdownName?: string | null;
  rivalShowdownName?: string | null;
  settings: Partial<LeagueSettings>;
  /** Mis Pokémon, para pegarlos en el Teambuilder. */
  myPokemonNames: string[];
  /** Ajustes de la liga y equipo: hasta tenerlos no se puede copiar nada (saldría otro formato). */
  status: 'loading' | 'error' | 'ready';
  onClose: () => void;
}

/**
 * Cómo jugar el partido en Showdown: el reto con las reglas de la liga, mi equipo para importarlo y los
 * pasos. Desde fuera no se puede crear el combate: lo lanza un jugador y lo acepta el otro.
 */
export default function PlayShowdownModal({
  rival, myShowdownName, rivalShowdownName, settings, myPokemonNames, status, onClose,
}: PlayShowdownModalProps) {
  const titleId = useId();
  const [copied, setCopied] = useState<Copyable | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const ready = status === 'ready';
  const canChallenge = !!myShowdownName && !!rivalShowdownName && status !== 'error';
  const command = rivalShowdownName && ready ? challengeCommand(settings) : '';
  const gameType = settings.battleGameType ?? BATTLE_DEFAULTS.battleGameType;
  const picked = settings.pickedTeamSize ?? BATTLE_DEFAULTS.pickedTeamSize;

  function copy(text: string, what: Copyable) {
    Clipboard.write({ string: text })
      .then(() => setCopied(what))
      .catch(() => addToast('error', 'No se pudo copiar. Cópialo a mano.'));
  }

  return (
    <Modal labelledBy={titleId} onClose={onClose} className="play-showdown">
      <h2 id={titleId}>Jugar en Showdown</h2>

      {!myShowdownName && (
        <p className="field-hint field-hint-error">
          <Link to="/profile">Vincula tu cuenta de Showdown en tu perfil.</Link>
        </p>
      )}
      {!rivalShowdownName && (
        <p className="field-hint field-hint-error">{rival} no ha vinculado su cuenta de Showdown.</p>
      )}

      {status === 'error' && (
        <p className="field-hint field-hint-error" role="alert">
          No se pudieron cargar los ajustes de la liga. Cierra y vuelve a intentarlo.
        </p>
      )}

      {canChallenge && (
        <>
          <p className="play-showdown-where">En el chat privado con {rivalShowdownName}:</p>
          <div className="play-showdown-command" aria-busy={!ready}>
            <code>{command}</code>
            <button
              type="button"
              className="btn-primary"
              onClick={() => copy(command, 'challenge')}
              disabled={!ready}
            >
              {copied === 'challenge' ? '✓ Copiado' : 'Copiar reto'}
            </button>
          </div>
        </>
      )}

      <ol className="play-showdown-steps">
        <li>En Showdown, abre el Teambuilder, crea un equipo nuevo y pega tu equipo con «Import from text».</li>
        <li>
          Completa movimientos, objetos, habilidades y estadísticas, y elige el formato {SHOWDOWN_FORMAT_NAMES[gameType]}.
        </li>
        <li>
          Quien reta abre un chat privado con el rival en Showdown («Find a user»), pega el reto y elige su equipo; el
          rival elige el suyo al aceptar.
        </li>
        {picked < 6 && <li>En el Team Preview, cada uno elige sus {picked} Pokémon.</li>}
      </ol>

      <p className="field-hint">
        Al terminar cada partida, pulsa «Upload and share replay» en Showdown: sin replay no se podrá importar el
        resultado.
      </p>

      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={onClose}>Cerrar</button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => copy(showdownTeamText(myPokemonNames), 'team')}
          disabled={!ready}
        >
          {copied === 'team' ? '✓ Copiado' : 'Copiar mi equipo'}
        </button>
        <a className="btn-primary" href={SHOWDOWN_PLAY_URL} target="_blank" rel="noopener noreferrer">
          Abrir Showdown
        </a>
      </div>
    </Modal>
  );
}
