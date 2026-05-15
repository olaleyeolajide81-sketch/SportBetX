import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Clock, 
  Trophy, 
  Users,
  Search,
  Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBettingStore } from '../store/bettingStore';
import { useWalletStore } from '../store/walletStore';
import { BetSlip } from '../components/BetSlip';
import { EventCard } from '../components/EventCard';
import { SportsFilter } from '../components/SportsFilter';
import { LiveScore } from '../components/LiveScore';
import { SportsEvent, BetType } from '../types/sports';
import { useI18n } from '../i18n/I18nProvider';

export const BettingInterface: React.FC = () => {
  const { t } = useTranslation();
  const {
    events,
    selectedEvents,
    betSlip,
    oddsFormat,
    setEvents,
    setSelectedEvents,
    setBetSlip,
    setOddsFormat,
    placeBet,
  } = useBettingStore();

  const { isConnected, account } = useWalletStore();
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'time' | 'odds' | 'volume'>('time');
  const [searching, setSearching] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const fetchEvents = useCallback(async (term: string) => {
    setSearching(true);
    try {
      const status = showLiveOnly ? 'live' : undefined;
      const result = await searchEvents(term, selectedSport, status);
      const mapped: SportsEvent[] = result.data.map((e) => ({
        id: e.id,
        title: e.title,
        sport: e.sport,
        homeTeam: e.homeTeam,
        awayTeam: e.awayTeam,
        startTime: e.startTime,
        endTime: e.startTime + 3600000,
        status: e.status as 'upcoming' | 'live' | 'finished',
        outcome: 'pending',
        odds: e.odds,
        volume: e.volume,
      }));
      setEvents(mapped);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setSearching(false);
    }
  }, [selectedSport, showLiveOnly, setEvents]);

  useEffect(() => {
    fetchEvents(debouncedSearch);
  }, [debouncedSearch, fetchEvents]);

  const handleEventSelect = (event: SportsEvent, selection: string, odds: number) => {
    const betSelection = {
      event,
      selection,
      odds,
      type: 'moneyline' as BetType,
    };

    const existingIndex = selectedEvents.findIndex(
      (item) => item.event.id === event.id && item.selection === selection
    );

    if (existingIndex >= 0) {
      // Remove from selection
      const newSelected = selectedEvents.filter((_, index) => index !== existingIndex);
      setSelectedEvents(newSelected);
    } else {
      // Add to selection
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

  const filteredEvents = events.filter((event) => {
    const matchesSport = selectedSport === 'all' || event.sport === selectedSport;
    const matchesLive = !showLiveOnly || event.status === 'live';
    return matchesSport && matchesLive;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    switch (sortBy) {
      case 'time':
        return a.startTime - b.startTime;
      case 'odds':
        return Math.max(...Object.values(a.odds)) - Math.max(...Object.values(b.odds));
      case 'volume':
        return b.volume - a.volume;
      default:
        return 0;
    }
  });

  const formatOdds = (odds: number) => {
    return convertOdds(odds / 100, 'decimal', oddsFormat as OddsFormat);
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
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t.betting.title}
            </h1>
            <div className="flex items-center space-x-2">
              <div className="relative">
                {searching ? (
                  <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                )}
                <input
                  type="text"
                  placeholder={t.betting.search}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
                )}
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
                <span>{t('betting.liveOnly')}</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <SportsFilter
              selectedSport={selectedSport}
              onSportChange={setSelectedSport}
            />
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'time' | 'odds' | 'volume')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="time">{t('betting.sortByTime')}</option>
              <option value="odds">{t('betting.sortByOdds')}</option>
              <option value="volume">{t('betting.sortByVolume')}</option>
            </select>

            <select
              value={oddsFormat}
              onChange={(e) => setOddsFormat(e.target.value as 'decimal' | 'american' | 'fractional')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="decimal">{t.betting.decimal}</option>
              <option value="american">{t.betting.american}</option>
              <option value="fractional">{t.betting.fractional}</option>
            </select>
          </div>
        </div>

        {/* Events Grid */}
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
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400">
              {t('betting.noEvents')}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Live Scores */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Trophy className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t.liveScores.title}
            </h2>
          </div>
          
          <div className="space-y-3">
            {events
              .filter(event => event.status === 'live')
              .slice(0, 5)
              .map((event) => (
                <LiveScore key={event.id} event={event} />
              ))}
          </div>
        </div>

        {/* Bet Slip */}
        <BetSlip
          betSlip={betSlip}
          onPlaceBet={handlePlaceBet}
          onRemoveBet={(index) => {
            const newSlip = betSlip.filter((_, i) => i !== index);
            setBetSlip(newSlip);
          }}
          formatOdds={formatOdds}
        />

        {/* Quick Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('betting.platformStats')}
            </h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('betting.totalVolume')}</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {events.reduce((sum, event) => sum + event.volume, 0) / 1000000} XLM
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('betting.liveEvents')}</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {events.filter(event => event.status === 'live').length}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Active Bettors</span>
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
