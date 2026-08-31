import { useScanStore } from '../store/scanStore';
import { scanAPI } from './api';

export const submitScan = async (imageUri: string) => {
  const store = useScanStore.getState();
  store.setPhase('analyzing');
  store.setAnalyzingStep(0);
  store.setError(null);
  
  try {
    // Step 0: Uploading & Vision
    // In a real app we'd poll or use websockets for accurate phase timing.
    // For this implementation, we'll simulate the steps visually while the API call is in flight.
    
    const stepInterval = setInterval(() => {
      const currentStep = useScanStore.getState().analyzingStep;
      if (currentStep < 2) {
        useScanStore.getState().setAnalyzingStep((currentStep + 1) as 1 | 2);
      }
    }, 2500);
    
    const result = await scanAPI.upload(imageUri);
    
    clearInterval(stepInterval);
    
    store.setScanResult(result);
    store.setPhase('results');
    
  } catch (error: any) {
    console.error('Scan failed:', error);
    store.setError(error.message || 'Failed to process scan. Please try again.');
    store.setPhase('error');
  }
};
