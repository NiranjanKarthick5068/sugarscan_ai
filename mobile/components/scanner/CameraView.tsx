import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraView as ExpoCameraView, useCameraPermissions } from 'expo-camera';
import Animated, { useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { Image as ImageIcon, RotateCcw, Zap, Scan } from 'lucide-react-native';
import { useCamera } from '../../hooks/useCamera';
import { NeonButton } from '../ui/NeonButton';
import { COLORS, SHADOWS } from '../../theme/tokens';

interface CameraViewProps {
  onCapture: (uri: string) => void;
  onGallery: () => void;
}

export function CameraView({ onCapture, onGallery }: CameraViewProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const { cameraRef, takePicture } = useCamera();
  const [flash, setFlash] = useState<boolean>(false);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need your permission to show the camera</Text>
        <NeonButton onPress={requestPermission}>Grant Permission</NeonButton>
        <View style={{ height: 16 }} />
        <NeonButton onPress={onGallery}>Upload from Gallery</NeonButton>
      </View>
    );
  }

  const handleCapture = async () => {
    const uri = await takePicture();
    if (uri) onCapture(uri);
  };

  return (
    <View style={styles.container}>
      <ExpoCameraView style={StyleSheet.absoluteFillObject} facing="back" enableTorch={flash} ref={cameraRef as any} />
        
      {/* Top Controls */}
      <View style={styles.topBar}>
         <Text style={styles.title}>Food Scanner</Text>
         <TouchableOpacity 
           style={[styles.flashButton, flash && styles.flashButtonActive]} 
           onPress={() => setFlash(!flash)}
         >
           <Zap size={18} color={flash ? COLORS.neon : '#fff'} />
         </TouchableOpacity>
      </View>

      {/* Scan Frame */}
      <View pointerEvents="none" style={styles.frameContainer}>
         <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            <Scanline />
         </View>
         <Text style={styles.frameHint}>Position your food in the frame</Text>
      </View>

      {/* Bottom Controls Sheet */}
      <View style={styles.bottomSheet}>
         <View style={styles.grabber} />
         <Text style={styles.sheetTitle}>Ready to Scan</Text>
         <Text style={styles.sheetSubtitle}>Tap to scan your food</Text>

         <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.iconButton} onPress={onGallery}>
               <ImageIcon size={20} color={COLORS.textOnLight} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
               <View style={styles.captureRing} />
               <Scan size={30} color={COLORS.bgCard} strokeWidth={2.2} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton}>
               <RotateCcw size={20} color={COLORS.textOnLight} />
            </TouchableOpacity>
         </View>
      </View>
    </View>
  );
}

function Scanline() {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{
      translateY: withRepeat(
        withSequence(
          withTiming(220, { duration: 2200 }),
          withTiming(0, { duration: 2200 })
        ),
        -1,
        true
      )
    }]
  }));

  return (
    <Animated.View style={[styles.scanline, animatedStyle]} />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDeep },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: COLORS.bgDeep },
  permissionText: { color: '#FFF', textAlign: 'center', marginBottom: 24, fontSize: 16 },
  topBar: { position: 'absolute', top: 60, left: 24, right: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  title: { color: '#FFF', fontSize: 17, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  flashButton: { position: 'absolute', right: 0, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  flashButtonActive: { backgroundColor: 'rgba(170,255,0,0.2)', borderColor: 'rgba(170,255,0,0.3)' },
  frameContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -80 },
  scanFrame: { width: 240, height: 240, position: 'relative' },
  corner: { position: 'absolute', width: 36, height: 36, borderColor: COLORS.neon, borderRadius: 6, shadowColor: COLORS.neon, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 8 },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  scanline: { position: 'absolute', left: 8, right: 8, height: 2, top: 0, shadowColor: COLORS.neon, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 16, elevation: 10, backgroundColor: COLORS.neon },
  frameHint: { marginTop: 24, color: COLORS.textSecondary, fontSize: 13 },
  bottomSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 120, paddingTop: 12, borderTopWidth: 1, borderColor: COLORS.borderLight },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: COLORS.borderLight, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { color: COLORS.textOnLight, fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  sheetSubtitle: { color: COLORS.textOnLightSoft, fontSize: 11, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  iconButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.bgCardAlt, borderWidth: 1, borderColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center' },
  captureButton: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.lime, alignItems: 'center', justifyContent: 'center', ...SHADOWS.limeButtonGlow },
  captureRing: { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: 40, borderWidth: 3, borderColor: 'rgba(170,255,0,0.4)' },
});
