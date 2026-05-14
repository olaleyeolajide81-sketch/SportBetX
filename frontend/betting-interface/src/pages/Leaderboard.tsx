import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useWalletStore } from '../store/walletStore';

type LeaderboardType = 'profit' | 'winrate' | 'liquidity';
type LeaderboardPeriod = '24h' | '7d' | '30d' | 'all';

interface LeaderboardEntry {
  rank: number;
  user_address: string;
  net_profit?: number;
  win_rate?: number;
  total_liquidity?: number;
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const Leaderboard: React.FC = () => {
  const { account } = useWalletStore();
  const [type, setType] = useState<LeaderboardType>('profit');
  const [period, setPeriod] = useState<LeaderboardPeriod>('7d');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/v1/leaderboard?type=${type}&period=${period}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load leaderboard');
        return r.json();
      })
      .then(({ data }) => setEntries(data))
      .catch((e) => { if (e.name !== 'AbortError') setError(e.message); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [type, period]);

  const formatValue = (entry: LeaderboardEntry) => {
    if (type === 'profit') return `${((entry.net_profit ?? 0) / 1e7).toFixed(2)} XLM`;
    if (type === 'winrate') return `${entry.win_rate ?? 0}%`;
    return `${((entry.total_liquidity ?? 0) / 1e7).toFixed(2)} XLM`;
  };

  const shortAddress = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leaderboard</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['profit', 'winrate', 'liquidity'] as LeaderboardType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                type === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t === 'profit' ? 'Top Profit' : t === 'winrate' ? 'Win Rate' : 'Liquidity'}
            </button>
          ))}

          <div className="ml-auto flex gap-2">
            {(['24h', '7d', '30d', 'all'] as LeaderboardPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  period === p
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading && <p className="text-center text-gray-500 py-8">Loading…</p>}
        {error && <p className="text-center text-red-500 py-8">{error}</p>}
        {!loading && !error && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                <th className="pb-2 w-12">#</th>
                <th className="pb-2">Address</th>
                <th className="pb-2 text-right">
                  {type === 'profit' ? 'Net Profit' : type === 'winrate' ? 'Win Rate' : 'Liquidity'}
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isMe = account && entry.user_address === account;
                return (
                  <tr
                    key={entry.user_address}
                    className={`border-b dark:border-gray-700 last:border-0 ${
                      isMe ? 'bg-blue-50 dark:bg-blue-900/30 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2.5 text-lg">
                      {MEDAL[entry.rank] ?? entry.rank}
                    </td>
                    <td className="py-2.5 font-mono text-gray-800 dark:text-gray-200">
                      {shortAddress(entry.user_address)}
                      {isMe && <span className="ml-2 text-xs text-blue-500">(you)</span>}
                    </td>
                    <td className="py-2.5 text-right text-gray-900 dark:text-white">
                      {formatValue(entry)}
                    </td>
                  </tr>
                );
              })}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-500">No data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
};
