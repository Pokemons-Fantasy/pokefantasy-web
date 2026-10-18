import { Link } from 'react-router-dom';
import { LEGAL_CONTACT_EMAIL, LEGAL_CONTROLLER } from '../legal';

/** Página pública con el aviso legal del proyecto (auditoría legal L1 y L4). */
export default function AboutPage() {
  return (
    <div className="auth-page">
      <article className="auth-card about-card">
        <h1>Acerca de PokeFantasy</h1>
        <p>
          PokeFantasy es un proyecto fan sin ánimo de lucro para jugar ligas fantasy de Pokémon con amigos. No tiene
          anuncios, no cobra nada y no acepta donaciones.
        </p>
        <p>
          Es un proyecto independiente, no afiliado a Nintendo, Game Freak, Creatures ni The Pokémon Company, y
          sin su respaldo.
          Pokémon y los nombres de los Pokémon son marcas de sus respectivos titulares.
        </p>
        <p>
          Los datos y las imágenes de los Pokémon se obtienen de{' '}
          <a href="https://pokeapi.co" target="_blank" rel="noopener noreferrer">PokeAPI</a> y no se alojan en
          este sitio.
        </p>
        <p>
          Lo mantiene {LEGAL_CONTROLLER}. Contacto:{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
        </p>
        <p className="auth-footer"><Link to="/">Volver</Link></p>
      </article>
    </div>
  );
}
