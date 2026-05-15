import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface SearchResult {
  id: string;
  title: string;
  sport: string;
  status: string;
  homeTeam: string;
  awayTeam: string;
  startTime: number;
  odds: { home: number; away: number; draw: number };
  volume: number;
}

export async function searchEvents(
  q: string,
  sport?: string,
  status?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ data: SearchResult[]; pagination: { page: number; pageSize: number; total: number } }> {
  const params: Record<string, string | number> = { q, page, pageSize };
  if (sport && sport !== 'all') params.sport = sport;
  if (status) params.status = status;

  const { data } = await axios.get(`${API_URL}/api/v1/search/events`, { params });
  return data;
}
