import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function HomePage() {
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

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
          <div className="home-card" onClick={() => navigate('/leagues')}>
            <h3>Mis Ligas</h3>
            <p>Ver y gestionar tus ligas de fantasy</p>
            <span className="home-card-cta">Entrar</span>
          </div>
        </div>
      </main>
    </div>
  );
}
