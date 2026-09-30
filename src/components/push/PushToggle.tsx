import { useWebPush } from '../../hooks/useWebPush';

/** Interruptor de los avisos de este navegador (Mi perfil y panel de la cuenta). */
export default function PushToggle() {
  const { status, busy, enable, disable } = useWebPush();
  if (status === 'hidden') return null;

  if (status === 'unsupported') return <p className="config-hint">Este navegador no admite notificaciones.</p>;
  if (status === 'needs-install') {
    return (
      <p className="config-hint">
        En el iPhone, añade PokeFantasy a la pantalla de inicio (Compartir → «Añadir a pantalla de inicio») y
        actívalas desde ahí.
      </p>
    );
  }
  if (status === 'blocked') {
    return (
      <p className="config-hint">
        Las has bloqueado en el navegador. Para recibirlas, permítelas en los ajustes del sitio (el icono junto
        a la dirección) y recarga la página.
      </p>
    );
  }

  const on = status === 'enabled';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={`push-toggle${on ? ' on' : ''}`}
      onClick={on ? disable : enable}
      disabled={busy}
    >
      <span className="push-toggle-label">Notificaciones en este dispositivo</span>
      <span className="push-toggle-track" aria-hidden="true"><span className="push-toggle-thumb" /></span>
    </button>
  );
}
