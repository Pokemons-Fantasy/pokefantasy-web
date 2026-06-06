import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
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
        <h1 className="page-title" style={{ color: 'var(--red)' }}>Algo ha ido mal</h1>
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

  render() {
    if (this.state.hasError) {
      return <FallbackScreen error={this.state.error} />;
    }
    return this.props.children;
  }
}
