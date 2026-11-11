import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal from './Modal';
import { getLatestRelease } from '../api/appUpdate';
import { isNewerVersion, releaseNoteLines } from '../utils/appUpdate';

/** Versión que el usuario ha dicho que no quiere instalar ("Ahora no"): preferencia local de este móvil. */
const DISMISSED_KEY = 'pf:update-dismissed';

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

function saveDismissed(version: string) {
  try {
    localStorage.setItem(DISMISSED_KEY, version);
  } catch {
    // Sin almacenamiento, volverá a avisar la próxima vez: no pasa nada
  }
}

interface AppUpdateNoticeProps {
  /** Versión instalada; por defecto la del build. */
  currentVersion?: string;
}

/**
 * Aviso de nueva versión de la app Android: compara con la última release de GitHub y ofrece la APK.
 * Solo se monta en la app nativa (la web se actualiza sola al desplegar). Si GitHub falla, no dice nada.
 * Cerrado sin elegir, vuelve a salir al abrir la app otra vez; con "Ahora no", no vuelve a avisar de esa versión.
 */
export default function AppUpdateNotice({ currentVersion = __APP_VERSION__ }: AppUpdateNoticeProps) {
  const titleId = useId();
  const [dismissed, setDismissed] = useState(readDismissed);
  const [closed, setClosed] = useState(false);
  const { data: release } = useQuery({
    queryKey: ['app-update'],
    queryFn: getLatestRelease,
    staleTime: 60 * 60_000,
    retry: false,
  });

  if (!release || closed || dismissed === release.version || !isNewerVersion(release.version, currentVersion)) {
    return null;
  }

  const close = () => setClosed(true);
  function notNow() {
    saveDismissed(release!.version);
    setDismissed(release!.version);
  }
  const notes = releaseNoteLines(release.notes);

  return (
    <Modal labelledBy={titleId} onClose={close}>
      <h2 id={titleId}>Nueva versión {release.version}</h2>
      {notes.length > 0 && (
        <ul className="update-notes">
          {notes.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
      )}
      <p className="field-hint">
        Se descarga la APK: ábrela y se instala encima de la que tienes, sin perder la sesión.{' '}
        <a href={release.pageUrl} target="_blank" rel="noopener noreferrer">Ver en GitHub</a>
      </p>
      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={notNow}>Ahora no</button>
        <a className="btn-primary" href={release.apkUrl} target="_blank" rel="noopener noreferrer" onClick={close}>
          Descargar
        </a>
      </div>
    </Modal>
  );
}
