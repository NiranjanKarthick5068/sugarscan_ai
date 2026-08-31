import { useQuery } from '@tanstack/react-query';
import { glucoseAPI } from '../services/api';

export function useGlucoseTrends(days: number = 7) {
  return useQuery({
    queryKey: ['glucoseTrends', days],
    queryFn: () => glucoseAPI.trends(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
