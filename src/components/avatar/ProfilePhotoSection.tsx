import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteAvatar, getMe } from '../../api/auth';
import { useToastStore } from '../../store/toastStore';
import { extractErrorMessage } from '../../utils/errorMessage';
import { avatarFileError } from '../../utils/avatarFile';
import UserAvatar from './UserAvatar';
import AvatarEditorModal from './AvatarEditorModal';

interface ProfilePhotoSectionProps {
  username: string;
}

/** Subir, cambiar o quitar la foto de perfil (Mi perfil). */
export default function ProfilePhotoSection({ username }: ProfilePhotoSectionProps) {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const inputRef = useRef<HTMLInputElement>(null);
  const changeButtonRef = useRef<HTMLButtonElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 5 * 60_000 });
  const hasPhoto = me?.avatarVersion != null;

  const remove = useMutation({
    mutationFn: deleteAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['league-detail'] });
      setConfirmingRemove(false);
      addToast('success', 'Foto de perfil quitada');
    },
    onError: (error) => addToast('error', extractErrorMessage(error, 'No se pudo quitar la foto')),
  });

  function onFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo fichero
    if (!chosen) return;
    const error = avatarFileError(chosen);
    if (error) {
      addToast('error', error);
      return;
    }
    setFile(chosen);
  }

  function closeEditor() {
    setFile(null);
    changeButtonRef.current?.focus();
  }

  return (
    <div className="profile-photo">
      <UserAvatar
        username={username}
        size={96}
        avatarVersion={me?.avatarVersion ?? null}
        className="member-avatar-hero"
      />
      <div className="profile-photo-actions">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          aria-label="Elegir foto de perfil"
          onChange={onFileChosen}
        />
        <button
          ref={changeButtonRef}
          type="button"
          className="btn-secondary"
          onClick={() => inputRef.current?.click()}
        >
          {hasPhoto ? 'Cambiar foto' : 'Subir foto'}
        </button>
        {hasPhoto && !confirmingRemove && (
          <button type="button" className="btn-ghost" onClick={() => setConfirmingRemove(true)}>
            Quitar foto
          </button>
        )}
        {hasPhoto && confirmingRemove && (
          <span className="profile-photo-confirm" role="group" aria-label="Confirmar quitar foto">
            ¿Quitar la foto?
            <button
              type="button"
              className="btn-danger"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              Sí, quitar
            </button>
            <button type="button" className="btn-ghost" onClick={() => setConfirmingRemove(false)}>
              No
            </button>
          </span>
        )}
      </div>
      {file && <AvatarEditorModal file={file} onClose={closeEditor} />}
    </div>
  );
}
