import { useEffect, useRef, useState, type ReactNode } from 'react';
import { scrollEdges } from '../../utils/scrollEdges';

interface FilterRowProps {
  label: string;
  className?: string;
  children: ReactNode;
}

/**
 * Fila de filtros del Pool. En móvil se desplaza en horizontal y difumina el borde que tiene más filtros
 * ocultos; en escritorio se reparte en varias líneas (CSS), así que no hay nada que difuminar.
 */
export default function FilterRow({ label, className = '', children }: FilterRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const next = scrollEdges(el);
      setEdges((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, []);

  const fade = `${edges.start ? ' fade-start' : ''}${edges.end ? ' fade-end' : ''}`;
  return (
    <div ref={ref} className={`gen-tabs pool-filter-row ${className}${fade}`.trim()} role="group" aria-label={label}>
      {children}
    </div>
  );
}
