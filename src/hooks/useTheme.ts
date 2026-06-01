import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'pf-theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'dark'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light');
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggle };
}
