import { Link } from 'react-router-dom';
import { LEGAL_CONTACT_EMAIL, LEGAL_CONTROLLER } from '../legal';

/** Política de privacidad (RGPD art. 13, auditoría legal L2). Pública: se enlaza desde el registro. */
export default function PrivacyPage() {
  const contact = <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>;
  return (
    <div className="auth-page">
      <article className="auth-card about-card">
        <h1>Política de privacidad</h1>

        <h2>Responsable</h2>
        <p>{LEGAL_CONTROLLER}. Contacto: {contact}.</p>

        <h2>Qué datos tratamos</h2>
        <ul>
          <li>Tu nombre de usuario.</li>
          <li>Tu contraseña, guardada solo como hash bcrypt: nadie puede leerla.</li>
          <li>Tu foto de perfil, si la subes.</li>
          <li>
            Tu dirección IP: para limitar los intentos de inicio de sesión y de registro (entre 15 minutos y 30
            días) y en los registros técnicos del servidor.
          </li>
          <li>Los tokens de los avisos push, si los activas.</li>
          <li>Tu actividad en las ligas: picks, robos, intercambios, resultados y monedas.</li>
        </ul>

        <h2>Para qué y con qué base</h2>
        <p>
          Para prestarte el servicio que pides al registrarte (art. 6.1.b del RGPD). No hay publicidad, ni perfiles
          comerciales, ni venta de datos.
        </p>

        <h2>Quién más los trata</h2>
        <p>
          Proveedores que alojan el servicio: Render (servidor), Netlify (web), MongoDB Atlas (base de datos),
          Upstash (Redis), Firebase (avisos push), Sentry (errores) y GitHub (código e imágenes de los Pokémon).
          Algunos pueden tratar datos fuera de la UE, con el EU-US Data Privacy Framework o cláusulas contractuales
          tipo.
        </p>

        <h2>Cuánto tiempo</h2>
        <p>
          Mientras tu cuenta exista. Al borrarla se eliminan tus datos y, en el historial de las ligas, tu nombre
          pasa a «Usuario eliminado».
        </p>

        <h2>Cookies</h2>
        <p>
          Solo cookies técnicas para mantener la sesión (<code>jwt</code>, <code>refresh</code>) y almacenamiento
          local para recordar quién eres y el tema (<code>auth-storage</code>, <code>pf-theme</code>). Sin cookies
          de terceros ni analítica.
        </p>

        <h2>Tus derechos</h2>
        <p>
          Puedes acceder a tus datos, rectificarlos, oponerte o limitar su tratamiento y pedir su portabilidad
          escribiendo a {contact}. Puedes borrar tu cuenta tú mismo con «Borrar cuenta» en Mi perfil. Si crees
          que no los tratamos bien, puedes reclamar ante la AEPD (
          <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">aepd.es</a>).
        </p>

        <h2>Edad mínima</h2>
        <p>Para registrarte tienes que tener 14 años o más.</p>

        <p className="auth-footer"><Link to="/">Volver</Link></p>
      </article>
    </div>
  );
}
