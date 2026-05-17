import { useQuery } from '@tanstack/react-query';

import { aiService } from '../services/aiService';

export const useAiStatus = () =>
  useQuery({
    queryKey: ['ai-status'],
    queryFn: aiService.getAiStatus,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

export default useAiStatus;
