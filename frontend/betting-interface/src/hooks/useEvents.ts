import { useQuery } from 'react-query';
import { searchEvents, SearchResult } from '../services/api';
import { SportsEvent } from '../types/sports';

function mapToSportsEvent(e: SearchResult): SportsEvent {
  return {
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
  };
}

export function useEvents(
  search: string,
  sport: string,
  showLiveOnly: boolean,
) {
  const status = showLiveOnly ? 'live' : undefined;

  const { data, isLoading, isError, refetch } = useQuery(
    ['events', search, sport, status],
    () => searchEvents(search, sport === 'all' ? undefined : sport, status),
    {
      select: (res) => res.data.map(mapToSportsEvent),
      staleTime: 30_000,
      refetchInterval: 30_000, // poll every 30s for live updates
      retry: 3,
      keepPreviousData: true,
    },
  );

  return { events: data ?? [], isLoading, isError, refetch };
}
