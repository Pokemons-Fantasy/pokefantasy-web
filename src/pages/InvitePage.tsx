import { useMutation } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { redeemInvite } from '../api/leagues';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';
import PageHeader from '../components/PageHeader';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);

  const { mutate: redeem, isPending } = useMutation({
    mutationFn: () => redeemInvite(token!),
    onSuccess: ({ leagueId }) => {
      addToast('success', '¡Te has unido a la liga!');
      navigate(`/leagues/${leagueId}`);
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'Link inválido o expirado')),
  });

  return (
    <div className="page-wrapper">
      <PageHeader left={
        <span className="logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/leagues')}>PokeFantasy</span>
      } />
      <main className="page-content">
        <div className="empty-state">
          <p>Has recibido una invitación para unirte a una liga.</p>
          <button
            className="btn-primary"
            style={{ marginTop: '1rem' }}
            onClick={() => redeem()}
            disabled={isPending}
          >
            {isPending ? 'Uniéndose...' : 'Unirse a la liga'}
          </button>
        </div>
      </main>
    </div>
  );
}
