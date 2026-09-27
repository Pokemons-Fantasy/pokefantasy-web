import { Component } from 'react';
import { useLocation } from 'react-router-dom';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  /** Si cambia mientras se muestra el error, se vuelve a intentar pintar children (sin remontar nada si no hay error). */
  resetKey?: unknown;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function FallbackScreen({ error }: { error: Error | null }) {
  return (
    <div className="page-wrapper">
      <main
        className="page-content"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          gap: '1rem',
        }}
      >
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <h1 className="page-title" style={{ color: 'var(--danger)' }}>Algo ha ido mal</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', maxWidth: '28rem' }}>
          Se ha producido un error inesperado. Puedes intentar recargar la página o volver al inicio.
        </p>
        {import.meta.env.DEV && error && (
          <pre
            style={{
              background: 'var(--surface-2)',
              color: 'var(--text-2)',
              fontSize: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              maxWidth: '32rem',
              overflowX: 'auto',
              textAlign: 'left',
            }}
          >
            {error.message}
          </pre>
        )}
        <div className="modal-actions" style={{ marginTop: '0.5rem' }}>
          <button
            className="btn-secondary"
            onClick={() => { window.location.href = '/'; }}
          >
            ← Inicio
          </button>
          <button
            className="btn-primary"
            onClick={() => window.location.reload()}
          >
            Recargar página
          </button>
        </div>
      </main>
    </div>
  );
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return <FallbackScreen error={this.state.error} />;
    }
    return this.props.children;
  }
}

/**
 * Error boundary de la app: al navegar a otra ruta vuelve a intentar pintar el contenido.
 * Usa resetKey y no key: una key por ruta remontaría los layouts anidados (LeagueLayout) en cada
 * cambio de pestaña, repitiendo sus queries y perdiendo el foco.
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}
