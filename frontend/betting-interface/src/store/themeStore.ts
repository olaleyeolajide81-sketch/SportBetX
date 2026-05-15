import { create } from 'zustand';

const STORAGE_KEY = 'sportbetx-theme';

function getInitialDarkMode(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === 'dark';
  } catch {
    // localStorage unavailable (SSR/test)
  }
  // Respect system preference on first visit
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(isDark: boolean): void {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', isDark);
  }
}

interface ThemeState {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  const initial = getInitialDarkMode();
  applyTheme(initial);

  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === null) {
        applyTheme(e.matches);
        set({ isDarkMode: e.matches });
      }
    };
    mediaQuery.addEventListener('change', handleChange);
  }

  return {
    isDarkMode: initial,
    toggleDarkMode: () =>
      set((state) => {
        const next = !state.isDarkMode;
        try { localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light'); } catch { /* ignore */ }
        applyTheme(next);
        return { isDarkMode: next };
      }),
    setDarkMode: (value: boolean) =>
      set(() => {
        try { localStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light'); } catch { /* ignore */ }
        applyTheme(value);
        return { isDarkMode: value };
      }),
  };
});
