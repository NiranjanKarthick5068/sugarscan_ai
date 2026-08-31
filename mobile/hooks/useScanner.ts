import { useMutation } from '@tanstack/react-query';
import { useScanStore } from '../store/scanStore';
import { scanAPI } from '../services/api';

export function useScanner() {
  const store = useScanStore();

  const scanMutation = useMutation({
    mutationFn: (imageUri: string) => {
      store.setCapturedImageUri(imageUri);
      store.setPhase('analyzing');
      store.setAnalyzingStep(0);
      store.setError(null);
      return scanAPI.upload(imageUri);
    },
    onSuccess: (data) => {
      store.setScanResult(data);
      store.setPhase('results');
    },
    onError: (error: any) => {
      console.error('Scan mutation error:', error);
      store.setError(error.message || 'Failed to analyze food');
      store.setPhase('error');
    },
  });

  // Helper to progress analyzing steps visually since it's a single API call
  const startMockProgress = () => {
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < 3) {
        store.setAnalyzingStep(step as 1 | 2);
      } else {
        clearInterval(interval);
      }
    }, 2500);
    return interval;
  };

  const submitScan = (imageUri: string) => {
    const interval = startMockProgress();
    scanMutation.mutate(imageUri, {
      onSettled: () => clearInterval(interval),
    });
  };

  return {
    ...store,
    submitScan,
    isProcessing: scanMutation.isPending,
  };
}
