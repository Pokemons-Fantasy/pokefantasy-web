import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'pf-theme';

/** Fondo de cada tema: barra de estado de Android (app) y barra del navegador (`theme-color`, web). */
export const THEME_BACKGROUND: Record<Theme, string> = { dark: '#0a0a0f', light: '#f4f4f8' };

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'dark'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light');
    localStorage.setItem(STORAGE_KEY, theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_BACKGROUND[theme]);

    if (Capacitor.isNativePlatform()) {
      if (theme === 'light') {
        StatusBar.setStyle({ style: Style.Light });
        StatusBar.setBackgroundColor({ color: THEME_BACKGROUND.light });
      } else {
        StatusBar.setStyle({ style: Style.Dark });
        StatusBar.setBackgroundColor({ color: THEME_BACKGROUND.dark });
      }
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggle };
}
