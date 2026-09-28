import { useEffect, useId, useRef, useState } from 'react';

export interface MemberAction {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

interface MemberMenuProps {
  username: string;
  actions: MemberAction[];
  /** Explicación en lugar de una acción que no se puede hacer (p. ej. el único admin no puede salir). */
  note?: string;
}

/** Menú ⋯ de una fila de miembro (patrón disclosure, como LeagueMenu). */
export default function MemberMenu({ username, actions, note }: MemberMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  if (actions.length === 0 && !note) return null;

  return (
    <div className="league-menu member-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="btn-ghost member-menu-button"
        aria-label={`Opciones de ${username}`}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        ⋯
      </button>
      {open && (
        <div id={listId} className="league-menu-list">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={`league-menu-item member-menu-item${action.danger ? ' danger' : ''}`}
              onClick={() => {
                setOpen(false);
                // El foco vuelve al botón ⋯ antes de abrir el diálogo, que lo devolverá ahí al cerrarse.
                buttonRef.current?.focus();
                action.onSelect();
              }}
            >
              {action.label}
            </button>
          ))}
          {note && <p className="member-menu-note">{note}</p>}
        </div>
      )}
    </div>
  );
}
