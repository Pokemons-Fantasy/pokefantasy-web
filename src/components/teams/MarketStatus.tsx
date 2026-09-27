import { useEffect, useState } from 'react';
import type { ScheduleResponse } from '../../api/leagues';
import { windowStatus, type MarketWindow } from '../../utils/market';

const WINDOWS: { kind: MarketWindow; label: string }[] = [
  { kind: 'steal', label: 'Robos' },
  { kind: 'swap', label: 'Intercambios y banquillo' },
];

/** Estado de las dos ventanas de mercado en una línea. Se refresca cada minuto por la cuenta atrás. */
export default function MarketStatus({ schedule }: { schedule: ScheduleResponse }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="market-status" role="status" aria-label="Estado del mercado">
      {WINDOWS.map(({ kind, label }) => {
        const { open, text } = windowStatus(kind, schedule, now);
        return (
          <div key={kind} className={`market-chip ${open ? 'open' : 'closed'}`}>
            <span className="market-chip-dot" aria-hidden="true" />
            <strong>{label}</strong>
            <span>{text}</span>
          </div>
        );
      })}
    </div>
  );
}
