import { useState } from 'react';

interface Props {
  onConfirm: (name: string) => void;
  onClose: () => void;
}

export default function CreateLeagueModal({ onConfirm, onClose }: Props) {
  const [name, setName] = useState('');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Crear liga</h2>
        <input
          className="search-input"
          type="text"
          placeholder="Nombre de la liga"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onConfirm(name.trim()); }}
          autoFocus
        />
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={!name.trim()} onClick={() => onConfirm(name.trim())}>
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}
