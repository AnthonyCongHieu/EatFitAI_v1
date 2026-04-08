import { useQuery } from '@tanstack/react-query';

import { aiService } from '../services/aiService';

export const useAiStatus = () =>
  useQuery({
    queryKey: ['ai-status'],
    queryFn: aiService.getAiStatus,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

export default useAiStatus;
