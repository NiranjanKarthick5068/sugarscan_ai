import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../../theme/tokens';
import { CameraView } from '../../../components/scanner/CameraView';
import { AnalyzingOverlay } from '../../../components/scanner/AnalyzingOverlay';
import { useScanner } from '../../../hooks/useScanner';
import { useCamera } from '../../../hooks/useCamera';

export default function ScanScreen() {
  const router = useRouter();
  const { phase, submitScan, error, resetScan, capturedImageUri } = useScanner();
  const { pickFromGallery } = useCamera();

  // Handle errors
  useEffect(() => {
    if (phase === 'error' && error) {
      alert(error);
      resetScan();
    }
  }, [phase, error]);

  // Handle successful scan
  useEffect(() => {
    if (phase === 'results') {
      router.push('/(app)/scan-result'); // Ensure this route exists
    }
  }, [phase]);

  // When tab is blurred, reset state
  // We'll use a simple effect for now, but in real app use useFocusEffect
  useEffect(() => {
    return () => {
      resetScan();
    };
  }, []);

  const handleCapture = (uri: string) => {
    submitScan(uri);
  };

  const handleGallery = async () => {
    const uri = await pickFromGallery();
    if (uri) {
      submitScan(uri);
    }
  };

  return (
    <View style={styles.container}>
      {phase === 'camera' && (
        <CameraView onCapture={handleCapture} onGallery={handleGallery} />
      )}
      
      {phase === 'analyzing' && (
        <AnalyzingOverlay imageUri={capturedImageUri} />
      )}
      
      {phase === 'error' && (
        <View style={styles.errorContainer}>
           <Text style={styles.errorText}>Scan Failed</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPage,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 18,
  }
});
