import { Link } from 'react-router-dom';

/** Aviso de proyecto fan en las pantallas públicas (auditoría legal L1). */
export default function FanDisclaimer() {
  return (
    <p className="fan-disclaimer" role="note">
      Proyecto fan sin ánimo de lucro, no afiliado a Nintendo, Game Freak, Creatures ni The Pokémon Company.{' '}
      <Link to="/about">Acerca de</Link> · <Link to="/privacy">Privacidad</Link>
    </p>
  );
}
