import { useState } from 'react';
import { avatarUrl } from '../../api/auth';
import { useAvatarVersion } from './AvatarVersionsContext';

interface UserAvatarProps {
  username: string;
  /** Diámetro en px. */
  size?: number;
  /** Versión de la foto. Sin ella se usa la de la liga abierta; `null` fuerza la inicial. */
  avatarVersion?: number | null;
  className?: string;
}

/**
 * Foto de perfil redonda; sin foto, o si no carga, la inicial. Es decorativa: el nombre del jugador
 * siempre va al lado. La inicial se pinta por CSS (`data-initial`) para no mezclarse con el texto.
 */
export default function UserAvatar({ username, size = 38, avatarVersion, className = '' }: UserAvatarProps) {
  const leagueVersion = useAvatarVersion(username);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const version = avatarVersion !== undefined ? avatarVersion : leagueVersion;
  const src = version != null ? avatarUrl(username, version) : null;
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };

  if (src && src !== failedSrc) {
    return (
      <img
        className={`member-avatar member-avatar-img ${className}`.trim()}
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        style={style}
        onError={() => setFailedSrc(src)}
      />
    );
  }
  return (
    <span
      className={`member-avatar ${className}`.trim()}
      data-initial={username.charAt(0)}
      aria-hidden="true"
      style={style}
    />
  );
}
