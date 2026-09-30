import { useWebPush } from '../../hooks/useWebPush';
import { shouldPrompt } from '../../utils/webPush';

const TEXT = {
  draft: 'Activa las notificaciones para enterarte de tu turno aunque cierres la página.',
  home: 'Activa las notificaciones para enterarte de tu turno, de los robos y de los intercambios aunque cierres la página.',
};

/** Aviso propio antes del permiso del navegador: el permiso solo se pide al pulsar "Activar". */
export default function PushPrompt({ context }: { context: 'draft' | 'home' }) {
  const { status, dismissed, busy, enable, dismiss } = useWebPush();
  if (!shouldPrompt(status, dismissed)) return null;

  if (status === 'needs-install') {
    return (
      <div className="push-prompt" role="status">
        <p className="push-prompt-text">
          Para recibir avisos en el iPhone, añade PokeFantasy a la pantalla de inicio: botón Compartir →
          «Añadir a pantalla de inicio». Ábrela desde ahí y actívalos.
        </p>
        <div className="push-prompt-actions">
          <button type="button" className="btn-ghost" onClick={dismiss}>Entendido</button>
        </div>
      </div>
    );
  }

  return (
    <div className="push-prompt" role="status">
      <p className="push-prompt-text">{TEXT[context]}</p>
      <div className="push-prompt-actions">
        <button type="button" className="btn-ghost" onClick={dismiss} disabled={busy}>Ahora no</button>
        <button type="button" className="btn-primary" onClick={enable} disabled={busy}>
          {busy ? 'Activando...' : 'Activar'}
        </button>
      </div>
    </div>
  );
}
