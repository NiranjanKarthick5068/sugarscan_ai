import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Check } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useScanStore } from '../../store/scanStore';
import { COLORS, SHADOWS } from '../../theme/tokens';

interface AnalyzingOverlayProps {
  imageUri: string | null;
}

export function AnalyzingOverlay({ imageUri }: AnalyzingOverlayProps) {
  const { analyzingStep } = useScanStore();
  const progress = useSharedValue(0);

  useEffect(() => {
    // Map step 0, 1, 2 to 33%, 66%, 100%
    const targetProgress = ((analyzingStep + 1) / 3) * 100;
    progress.value = withTiming(targetProgress, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [analyzingStep]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  const steps = [
    { label: 'Food Detection', done: analyzingStep >= 0 },
    { label: 'Nutrient Analysis', done: analyzingStep >= 1 },
    { label: 'Glycemic Prediction', done: analyzingStep >= 2 },
  ];

  const title = analyzingStep === 0 ? 'Uploading Image...' : analyzingStep === 1 ? 'AI Vision Processing...' : 'Analyzing Health Impact...';
  const subtitle = analyzingStep === 0 ? 'Securing scan data...' : analyzingStep === 1 ? 'Local AI is identifying food...' : 'Calculating glycemic response...';

  return (
    <View style={styles.container}>
      {imageUri && (
        <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFillObject} />
      )}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(4,5,15,0.7)' }]} />
      
      <View style={styles.content}>
         {/* Animated Image Thumbnail */}
         <View style={styles.thumbnailContainer}>
            {imageUri ? (
               <Image source={{ uri: imageUri }} style={styles.thumbnail} />
            ) : (
               <View style={[styles.thumbnail, { backgroundColor: '#333' }]} />
            )}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
            <ThumbnailScanline />
         </View>

         <Text style={styles.title}>{title}</Text>
         <Text style={styles.subtitle}>{subtitle}</Text>

         <View style={styles.progressSection}>
            <View style={styles.progressBarBg}>
               <Animated.View style={[styles.progressBarFill, animatedProgressStyle]}>
                  <LinearGradient
                     start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                     colors={[COLORS.neon, '#88DD00']}
                     style={StyleSheet.absoluteFillObject}
                  />
               </Animated.View>
            </View>
            <View style={styles.progressLabels}>
               <Text style={styles.progressHint}>
                 {analyzingStep === 0 ? 'Detecting food...' : analyzingStep === 1 ? 'Analyzing nutrients...' : 'Predicting glucose impact...'}
               </Text>
               <Text style={styles.progressPercent}>{Math.round(((analyzingStep + 1) / 3) * 100)}%</Text>
            </View>
         </View>

         <View style={styles.stepsList}>
            {steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                 <AnimatedStepIcon done={step.done} />
                 <Text style={[styles.stepLabel, { color: step.done ? '#FFF' : COLORS.textTertiary }]}>
                   {step.label}
                 </Text>
              </View>
            ))}
         </View>
      </View>
    </View>
  );
}

function ThumbnailScanline() {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(128, { duration: 2000, easing: Easing.linear }),
        withTiming(0, { duration: 0 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));

  return <Animated.View style={[styles.thumbnailScanline, animatedStyle]} />;
}

function AnimatedStepIcon({ done }: { done: boolean }) {
  const scale = useSharedValue(done ? 1 : 0.8);
  
  useEffect(() => {
    if (done) {
      scale.value = withSequence(
        withTiming(1.3, { duration: 150 }),
        withTiming(1, { duration: 150 })
      );
    }
  }, [done]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View style={[styles.stepIcon, animatedStyle, { backgroundColor: done ? COLORS.neon : 'rgba(255,255,255,0.12)' }]}>
       {done && <Check size={12} color={COLORS.dark} strokeWidth={3} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: 20, backgroundColor: COLORS.bgDeep },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  thumbnailContainer: { width: 128, height: 128, borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: COLORS.neon, marginBottom: 32, ...SHADOWS.neonGlowStrong },
  thumbnail: { width: '100%', height: '100%', resizeMode: 'cover' },
  thumbnailScanline: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#FFF', shadowColor: COLORS.neon, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10, elevation: 10 },
  title: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', paddingHorizontal: 16, marginBottom: 32 },
  progressSection: { width: '100%', marginBottom: 20 },
  progressBarBg: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4, shadowColor: COLORS.neon, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 6 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressHint: { color: COLORS.textTertiary, fontSize: 11 },
  progressPercent: { color: COLORS.neon, fontSize: 11, fontWeight: 'bold' },
  stepsList: { width: '100%', marginTop: 20, gap: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIcon: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 13, fontWeight: '500' },
});
