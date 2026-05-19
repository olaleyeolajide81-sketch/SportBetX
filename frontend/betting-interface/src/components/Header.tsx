import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useThemeStore } from '../store/themeStore';
import { useWalletStore } from '../store/walletStore';
import { useI18n } from '../i18n/I18nProvider';
import { LanguageSwitcher } from './LanguageSwitcher';

const navItems = [
  { path: '/', label: 'Betting' },
  { path: '/live', label: 'Live' },
  { path: '/history', label: 'History' },
  { path: '/profile', label: 'Profile' },
  { path: '/governance', label: 'Governance' },
  { path: '/leaderboard', label: 'Leaderboard' },
];

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
];

export const Header: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const { isConnected, account, connect, disconnect } = useWalletStore();
  const { t } = useI18n();

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm px-6 py-4 flex items-center justify-between">
      <nav className="flex gap-4 text-sm font-medium">
        <Link to="/" className="hover:text-blue-600">{t.nav.betting}</Link>
        <Link to="/live" className="hover:text-blue-600">{t.nav.live}</Link>
        <Link to="/history" className="hover:text-blue-600">{t.nav.history}</Link>
        <Link to="/governance" className="hover:text-blue-600">{t.nav.governance}</Link>
        <Link to="/leaderboard" className="hover:text-blue-600">{t.nav.leaderboard}</Link>
      </nav>
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <button onClick={toggleDarkMode} aria-label="Toggle dark mode" className="px-3 py-1 rounded border text-sm">
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        <button
          onClick={isConnected ? disconnect : connect}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          {isConnected ? `${account?.slice(0, 6)}…` : t.wallet.connect}
        </button>
      </div>
    </header>
  );
};
