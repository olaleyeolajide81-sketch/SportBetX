import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/themeStore';
import { useWalletStore } from '../store/walletStore';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
];

export const Header: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const { isConnected, account, connect, disconnect } = useWalletStore();
  const { t, i18n } = useTranslation();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm px-6 py-4 flex items-center justify-between">
      <nav className="flex gap-4 text-sm font-medium">
        <Link to="/" className="hover:text-blue-600">{t('nav.betting')}</Link>
        <Link to="/live" className="hover:text-blue-600">{t('nav.live')}</Link>
        <Link to="/history" className="hover:text-blue-600">{t('nav.history')}</Link>
        <Link to="/governance" className="hover:text-blue-600">{t('nav.governance')}</Link>
        <Link to="/leaderboard" className="hover:text-blue-600">{t('nav.leaderboard')}</Link>
        <Link to="/profile" className="hover:text-blue-600">{t('nav.profile')}</Link>
      </nav>
      <div className="flex items-center gap-3">
        {/* Language selector */}
        <div className="flex gap-1">
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => changeLanguage(code)}
              aria-label={`Switch to ${label}`}
              className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                i18n.language === code
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={toggleDarkMode} aria-label="Toggle dark mode" className="px-3 py-1 rounded border text-sm">
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        <button
          onClick={isConnected ? disconnect : connect}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          {isConnected ? `${account?.slice(0, 6)}…` : t('wallet.connect')}
        </button>
      </div>
    </header>
  );
};
