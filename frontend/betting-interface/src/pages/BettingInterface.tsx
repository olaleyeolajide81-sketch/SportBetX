import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Trophy, Users, Search, Loader2, AlertCircle } from 'lucide-react';
import { useBettingStore } from '../store/bettingStore';
import { useWalletStore } from '../store/walletStore';
import { BetSlip } from '../components/BetSlip';
import { EventCard } from '../components/EventCard';
import { SportsFilter } from '../components/SportsFilter';
import { LiveScore } from '../components/LiveScore';
import { SportsEvent, BetType, OddsFormat } from '../types/sports';
import { useI18n } from '../i18n/I18nProvider';
import { useDebounce } from '../hooks/useDebounce';
import { useEvents } from '../hooks/useEvents';
import { convertOdds } from '../utils/oddsConverter';

function EventSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
      <div className="flex gap-2">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
      </div>
    </div>
  );
}

export const BettingInterface: React.FC = () => {
  const { t } = useI18n();
  const {
    selectedEvents,
    betSlip,
    oddsFormat,
    setSelectedEvents,
    setBetSlip,
    setOddsFormat,
    placeBet,
  } = useBettingStore();

  const { isConnected, account } = useWalletStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'time' | 'odds' | 'volume'>('time');

  const debouncedSearch = useDebounce(searchTerm, 300);
  const { events, isLoading, isError, refetch } = useEvents(debouncedSearch, selectedSport, showLiveOnly);

  const sortedEvents = [...events].sort((a, b) => {
    switch (sortBy) {
      case 'time': return a.startTime - b.startTime;
      case 'odds': return Math.max(...Object.values(b.odds)) - Math.max(...Object.values(a.odds));
      case 'volume': return b.volume - a.volume;
      default: return 0;
    }
  });

  const formatOdds = (odds: number) =>
    convertOdds(odds / 100, 'decimal', oddsFormat as OddsFormat);

  const handleEventSelect = (event: SportsEvent, selection: string, odds: number) => {
    const betSelection = { event, selection, odds, type: 'moneyline' as BetType };
    const existingIndex = selectedEvents.findIndex(
      (item) => item.event.id === event.id && item.selection === selection,
    );
    if (existingIndex >= 0) {
      setSelectedEvents(selectedEvents.filter((_, i) => i !== existingIndex));
    } else {
      setSelectedEvents([...selectedEvents, betSelection]);
    }
  };

  const handlePlaceBet = async () => {
    if (!isConnected || !account || betSlip.length === 0) return;
    try {
      await placeBet();
    } catch (error) {
      console.error('Failed to place bet:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-1 lg:grid-cols-4 gap-6"
    >
      {/* Main Content */}
      <div className="lg:col-span-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t.betting.title}
            </h1>
            <div className="flex items-center space-x-2">
              <div className="relative">
                {isLoading ? (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                )}
                <input
                  type="text"
                  placeholder={t.betting.search}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowLiveOnly(!showLiveOnly)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  showLiveOnly
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{t.betting.liveOnly}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <SportsFilter selectedSport={selectedSport} onSportChange={setSelectedSport} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'time' | 'odds' | 'volume')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="time">{t.betting.sortByTime}</option>
              <option value="odds">{t.betting.sortByOdds}</option>
              <option value="volume">{t.betting.sortByVolume}</option>
            </select>
            <select
              value={oddsFormat}
              onChange={(e) => setOddsFormat(e.target.value as OddsFormat)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="decimal">{t.betting.decimal}</option>
              <option value="american">{t.betting.american}</option>
              <option value="fractional">{t.betting.fractional}</option>
            </select>
          </div>
        </div>

        {/* Error state */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">{t.common.error}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t.common.retry}
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && !isError && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <EventSkeleton key={i} />)}
          </div>
        )}

        {/* Events grid */}
        {!isLoading && !isError && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onSelect={handleEventSelect}
                selectedEvents={selectedEvents}
                formatOdds={formatOdds}
              />
            ))}
            {sortedEvents.length === 0 && (
              <div className="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">
                {t.betting.noEvents}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Trophy className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t.liveScores.title}
            </h2>
          </div>
          <div className="space-y-3">
            {events
              .filter((e) => e.status === 'live')
              .slice(0, 5)
              .map((event) => (
                <LiveScore key={event.id} event={event} />
              ))}
          </div>
        </div>

        <BetSlip
          betSlip={betSlip}
          onPlaceBet={handlePlaceBet}
          onRemoveBet={(index) => setBetSlip(betSlip.filter((_, i) => i !== index))}
          formatOdds={formatOdds}
        />

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t.stats.title}
            </h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t.stats.totalVolume}</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {(events.reduce((sum, e) => sum + e.volume, 0) / 1_000_000).toFixed(2)} XLM
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t.stats.liveEvents}</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {events.filter((e) => e.status === 'live').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t.stats.activeBettors}</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                <Users className="w-4 h-4 inline mr-1" />
                1,234
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
