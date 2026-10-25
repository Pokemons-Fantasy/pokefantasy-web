import { useId, useRef, useState } from 'react';
import Modal from './Modal';

interface Props {
  onConfirm: (name: string) => void;
  onClose: () => void;
}

export default function CreateLeagueModal({ onConfirm, onClose }: Props) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');

  return (
    <Modal labelledBy={titleId} onClose={onClose} initialFocusRef={inputRef}>
      <h2 id={titleId}>Crear liga</h2>
      <input
        ref={inputRef}
        className="search-input"
        type="text"
        placeholder="Nombre de la liga"
        aria-label="Nombre de la liga"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onConfirm(name.trim()); }}
      />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" disabled={!name.trim()} onClick={() => onConfirm(name.trim())}>
          Crear
        </button>
      </div>
    </Modal>
  );
}
