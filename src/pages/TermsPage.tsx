import { Link } from 'react-router-dom';
import { LEGAL_CONTACT_EMAIL } from '../legal';

/** Normas de uso (auditoría legal L5). Pública: se enlaza desde el registro. */
export default function TermsPage() {
  return (
    <div className="auth-page">
      <article className="auth-card about-card">
        <h1>Normas de uso</h1>
        <ol>
          <li>
            Sé respetuoso: nada de insultos, odio, contenido sexual ni datos personales de otros en nombres de
            usuario, nombres de liga o fotos.
          </li>
          <li>Una cuenta por persona. No suplantes a otros jugadores.</li>
          <li>No intentes romper ni saturar el servicio.</li>
          <li>
            Si algo incumple estas normas, el administrador puede quitar fotos, cambiar nombres de liga o borrar
            cuentas, sin aviso previo.
          </li>
          <li>
            Avisos y dudas: <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
          </li>
          <li>Es un proyecto fan sin garantías: puede cambiar o cerrar en cualquier momento.</li>
        </ol>
        <p className="auth-footer"><Link to="/">Volver</Link></p>
      </article>
    </div>
  );
}
