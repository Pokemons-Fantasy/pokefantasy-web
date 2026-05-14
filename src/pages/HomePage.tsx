import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { getPokemons } from '../api/pokemons';

export default function HomePage() {
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);

  const { data: pokemons, isLoading } = useQuery({
    queryKey: ['pokemons'],
    queryFn: getPokemons,
  });

  return (
    <div className="home-container">
      <header>
        <h1>PokeFantasy</h1>
        <div>
          <span>Hola, <strong>{username}</strong></span>
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      </header>
      <main>
        <h2>Pokémons disponibles</h2>
        {isLoading && <p>Cargando...</p>}
        {pokemons && (
          <p>{pokemons.length} pokémons disponibles para el draft</p>
        )}
      </main>
    </div>
  );
}
