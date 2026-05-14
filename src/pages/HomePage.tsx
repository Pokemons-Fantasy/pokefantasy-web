import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getClosedList, getDraftStatus } from '../api/pokemons';

export default function HomePage() {
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const { data: closedList = [] } = useQuery({
    queryKey: ['closed-list'],
    queryFn: getClosedList,
  });

  const { data: draftStatus } = useQuery({
    queryKey: ['draft-status'],
    queryFn: getDraftStatus,
  });

  const myNominations = closedList.filter((e) => e.nominatedBy === username);
  const isDraftActive = draftStatus && draftStatus.status !== 'PENDING';

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
        <div className="home-cards">
          <div className="home-card" onClick={() => navigate('/pool')}>
            <h3>Selección de Pool</h3>
            <p>
              {isDraftActive
                ? 'Pool cerrado — draft activo'
                : `${myNominations.length}/16 pokémons nominados`}
            </p>
            <span className="home-card-cta">
              {isDraftActive ? 'Ver pool' : 'Seleccionar'}
            </span>
          </div>
          <div className="home-card disabled">
            <h3>Draft</h3>
            <p>Estado: {draftStatus ? draftStatus.status : 'Sin draft'}</p>
            <span className="home-card-cta">Próximamente</span>
          </div>
        </div>
      </main>
    </div>
  );
}
