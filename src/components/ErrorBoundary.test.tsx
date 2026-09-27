import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useEffect } from 'react';
import { createMemoryRouter, RouterProvider, Outlet, useLocation } from 'react-router-dom';
import { RouteErrorBoundary } from './ErrorBoundary';

let mounts = 0;

function Shell() {
  useEffect(() => { mounts++; }, []);
  return <Outlet />;
}

function Page() {
  const { pathname } = useLocation();
  if (pathname === '/roto') throw new Error('fallo de render');
  return <p>página {pathname}</p>;
}

function renderAt(path: string) {
  const router = createMemoryRouter([
    {
      element: <RouteErrorBoundary><Shell /></RouteErrorBoundary>,
      children: [{ path: '*', element: <Page /> }],
    },
  ], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('RouteErrorBoundary', () => {
  beforeEach(() => {
    mounts = 0;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('cambiar de ruta no remonta el contenido (los layouts conservan estado y foco)', async () => {
    const router = renderAt('/a');
    expect(await screen.findByText('página /a')).toBeInTheDocument();

    await act(async () => { await router.navigate('/b'); });

    expect(screen.getByText('página /b')).toBeInTheDocument();
    expect(mounts).toBe(1);
  });

  it('tras un error, navegar a otra ruta vuelve a pintar el contenido', async () => {
    const router = renderAt('/roto');
    expect(await screen.findByText('Algo ha ido mal')).toBeInTheDocument();

    await act(async () => { await router.navigate('/b'); });

    expect(screen.getByText('página /b')).toBeInTheDocument();
  });
});
