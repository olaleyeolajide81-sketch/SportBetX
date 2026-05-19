import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useWalletStore } from '../store/walletStore';
import { useI18n } from '../i18n/I18nProvider';
import { LanguageSwitcher } from './LanguageSwitcher';

export const Header: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const { isConnected, account, balance, network, isLoading, error, connect, disconnect } = useWalletStore();
  const { t } = useI18n();

  const handleWalletClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

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

        {/* Freighter install prompt */}
        {error && error.includes('not installed') && (
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-yellow-600 dark:text-yellow-400 underline"
          >
            Install Freighter
          </a>
        )}

        {/* Wallet info when connected */}
        {isConnected && account && (
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            {network && (
              <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs">
                {network}
              </span>
            )}
            {balance !== null && (
              <span className="font-medium">{balance} XLM</span>
            )}
          </div>
        )}

        <button
          onClick={handleWalletClick}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
        >
          {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
          {isConnected ? `${account?.slice(0, 6)}…` : t.wallet.connect}
        </button>
      </div>
    </header>
  );
};
