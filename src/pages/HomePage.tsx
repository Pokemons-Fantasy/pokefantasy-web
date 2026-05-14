import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function HomePage() {
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="page-header-inner">
          <span className="logo">PokeFantasy</span>
          <div className="header-right">
            <span className="header-user">Hola, <strong>{username}</strong></span>
            <button className="btn-ghost" onClick={logout}>Cerrar sesión</button>
          </div>
        </div>
      </header>
      <main className="page-content">
        <h1 className="page-title">Bienvenido, {username}</h1>
        <p className="page-subtitle">Tu plataforma de Pokémon Fantasy</p>
        <div className="cards-grid" style={{ marginTop: '2rem' }}>
          <div className="card" onClick={() => navigate('/leagues')}>
            <h3>Mis ligas</h3>
            <p>Ver y gestionar tus ligas de fantasy</p>
            <span className="card-cta">Entrar →</span>
          </div>
        </div>
      </main>
    </div>
  );
}
