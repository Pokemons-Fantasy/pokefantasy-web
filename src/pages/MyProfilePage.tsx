import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getMyLeagues, getSeasonStats, setMyMvp, type PlayerSeasonStats } from '../api/leagues';
import { getDraftStatus } from '../api/pokemons';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';
import PageHeader from '../components/PageHeader';
import { SkeletonGrid } from '../components/SkeletonGrid';
import ChangePasswordForm from '../components/ChangePasswordForm';
import { getMe } from '../api/auth';
import UserAvatar from '../components/avatar/UserAvatar';
import ProfilePhotoSection from '../components/avatar/ProfilePhotoSection';

export default function MyProfilePage() {
  const username = useAuthStore((s) => s.username);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 5 * 60_000 });

  // leagueId de la liga cuyo MVP picker está abierto (null = cerrado)
  const [mvpPickerLeagueId, setMvpPickerLeagueId] = useState<string | null>(null);
  const [selectedMvp, setSelectedMvp] = useState<string>('');

  const { data: leagues = [], isLoading } = useQuery({
    queryKey: ['my-leagues'],
    queryFn: getMyLeagues,
    staleTime: 60_000,
  });

  // Fetch season stats en paralelo para todas las ligas
  const statsResults = useQueries({
    queries: leagues.map((l) => ({
      queryKey: ['season-stats', l.id],
      queryFn: () => getSeasonStats(l.id),
      staleTime: 120_000,
    })),
  });

  // Lazy fetch del draft cuando el picker está abierto
  const { data: pickerDraft } = useQuery({
    queryKey: ['draft-status', mvpPickerLeagueId],
    queryFn: () => getDraftStatus(mvpPickerLeagueId!),
    enabled: !!mvpPickerLeagueId,
    staleTime: 60_000,
  });

  const myPickerOptions = pickerDraft?.picks
    ?.filter((p) => p.username === username)
    .map((p) => p.pokemonName) ?? [];

  const { mutate: saveMvp, isPending: savingMvp } = useMutation({
    mutationFn: () => setMyMvp(mvpPickerLeagueId!, selectedMvp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season-stats', mvpPickerLeagueId] });
      addToast('success', `MVP actualizado: ${selectedMvp}`);
      setMvpPickerLeagueId(null);
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'Error al guardar MVP')),
  });

  return (
    <div className="page-wrapper">
      <PageHeader />

      <main className="page-content">

        {/* ── Hero ── */}
        <div className="animate-in" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
          <UserAvatar
            username={username ?? ''}
            size={64}
            avatarVersion={me?.avatarVersion ?? null}
            className="member-avatar-hero"
          />
          <div>
            <h1 className="page-title" style={{ marginBottom: '0.15rem' }}>{username}</h1>
            <p className="page-subtitle">
              {leagues.length} {leagues.length === 1 ? 'liga' : 'ligas'}
            </p>
          </div>
        </div>

        {/* ── Ligas ── */}
        <p className="section-label" style={{ marginBottom: '0.75rem' }}>Mis ligas</p>

        {isLoading && <SkeletonGrid />}

        {!isLoading && leagues.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon">🏆</span>
            <p>No perteneces a ninguna liga todavía.</p>
          </div>
        )}

        {!isLoading && leagues.length > 0 && (
          <div className="cards-grid animate-in">
            {leagues.map((league, i) => {
              const myStats: PlayerSeasonStats | undefined = statsResults[i]?.data
                ?.find((p) => p.username === username);

              return (
                <div key={league.id} className="card" style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/leagues/${league.id}/players/${username}`)}>

                  <div className="profile-league-head">
                    <div className="profile-league-name">{league.name}</div>
                    <span className={`badge ${league.status === 'ACTIVE' ? 'badge-green' : 'badge-yellow'}`}>
                      {league.status === 'ACTIVE' ? 'Activa' : 'Configuración'}
                    </span>
                  </div>

                  {/* Stats row — only when there are played games */}
                  {myStats && myStats.played > 0 && (
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.82rem', marginBottom: '0.35rem', marginTop: '0.5rem' }}>
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>{myStats.wins}V</span>
                      <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{myStats.losses}D</span>
                      <span style={{ color: 'var(--text-3)' }}>{myStats.winPct}%</span>
                      {myStats.currentStreak !== 0 && (
                        <span style={{ color: myStats.currentStreak > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                          {myStats.currentStreak > 0 ? `+${myStats.currentStreak}` : myStats.currentStreak} racha
                        </span>
                      )}
                    </div>
                  )}

                  {/* No games yet */}
                  {myStats && myStats.played === 0 && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '0.4rem' }}>
                      Sin partidos aún
                    </p>
                  )}

                  {/* MVP row — shown whenever there are stats (backend validates draft COMPLETED) */}
                  {myStats && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '0.25rem' }}
                      onClick={(e) => e.stopPropagation()}>
                      <span>⭐ MVP:</span>
                      {mvpPickerLeagueId === league.id ? (
                        <span style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                          <select
                            className="search-input"
                            style={{ fontSize: '0.78rem', padding: '0.15rem 0.4rem', height: 'auto' }}
                            value={selectedMvp}
                            onChange={(e) => setSelectedMvp(e.target.value)}
                          >
                            <option value="">-- Elige --</option>
                            {myPickerOptions.map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                          <button
                            className="btn-ghost"
                            style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}
                            disabled={!selectedMvp || savingMvp}
                            onClick={() => saveMvp()}
                          >
                            {savingMvp ? '...' : '✓'}
                          </button>
                          <button
                            className="btn-ghost"
                            style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', color: 'var(--text-3)' }}
                            onClick={() => { setMvpPickerLeagueId(null); setSelectedMvp(''); }}
                          >
                            ✕
                          </button>
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span style={{ color: 'var(--text-1)' }}>
                            {myStats.mvpPokemon ?? '—'}
                          </span>
                          <button
                            className="btn-ghost"
                            style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', lineHeight: 1 }}
                            title="Cambiar MVP"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMvp(myStats.mvpPokemon ?? '');
                              setMvpPickerLeagueId(league.id);
                            }}
                          >
                            ✏️
                          </button>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Foto de perfil ── */}
        <p className="section-label" style={{ margin: '2rem 0 0.75rem' }}>Foto de perfil</p>
        <ProfilePhotoSection username={username ?? ''} />

        {/* ── Cuenta ── */}
        <p className="section-label" style={{ margin: '2rem 0 0.75rem' }}>Cuenta</p>
        <ChangePasswordForm />

      </main>
    </div>
  );
}
