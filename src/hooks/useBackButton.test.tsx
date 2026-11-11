import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { AndroidBackButton, handleBack, useBackHandler } from './useBackButton';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: vi.fn(() => false) } }));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })),
    minimizeApp: vi.fn(() => Promise.resolve()),
  },
}));

function Handler({ onBack }: { onBack: (() => void) | undefined }) {
  useBackHandler(onBack);
  return null;
}

describe('useBackHandler / handleBack', () => {
  afterEach(() => vi.clearAllMocks());

  it('llama solo al de arriba y, al desmontarlo, al siguiente', () => {
    const a = vi.fn();
    const b = vi.fn();
    const goBack = vi.fn();
    const minimize = vi.fn();
    const { rerender, unmount } = render(<><Handler onBack={a} /><Handler onBack={b} /></>);

    handleBack(true, goBack, minimize);
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).not.toHaveBeenCalled();

    rerender(<Handler onBack={a} />);
    handleBack(true, goBack, minimize);
    expect(a).toHaveBeenCalledTimes(1);
    expect(goBack).not.toHaveBeenCalled();
    unmount();
  });

  it('si el de arriba no se puede cerrar, no hace nada', () => {
    const a = vi.fn();
    const goBack = vi.fn();
    const minimize = vi.fn();
    const { unmount } = render(<><Handler onBack={a} /><Handler onBack={undefined} /></>);
    handleBack(true, goBack, minimize);
    expect(a).not.toHaveBeenCalled();
    expect(goBack).not.toHaveBeenCalled();
    expect(minimize).not.toHaveBeenCalled();
    unmount();
  });

  it('sin paneles abiertos va atrás en el historial o minimiza la app', () => {
    const goBack = vi.fn();
    const minimize = vi.fn();
    handleBack(true, goBack, minimize);
    expect(goBack).toHaveBeenCalledTimes(1);
    handleBack(false, goBack, minimize);
    expect(minimize).toHaveBeenCalledTimes(1);
  });
});

describe('AndroidBackButton', () => {
  afterEach(() => vi.clearAllMocks());

  it('en la web no escucha el botón atrás', () => {
    render(<MemoryRouter><AndroidBackButton /></MemoryRouter>);
    expect(CapApp.addListener).not.toHaveBeenCalled();
  });

  it('en la app escucha el botón atrás y se da de baja al desmontar', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const remove = vi.fn();
    vi.mocked(CapApp.addListener).mockResolvedValue({ remove } as never);
    const { unmount } = render(<MemoryRouter><AndroidBackButton /></MemoryRouter>);
    expect(CapApp.addListener).toHaveBeenCalledWith('backButton', expect.any(Function));
    unmount();
    await Promise.resolve();
    expect(remove).toHaveBeenCalled();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  });
});
