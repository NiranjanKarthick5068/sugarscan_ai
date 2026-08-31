import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, SafeAreaView, Alert, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInUp, SlideInDown } from 'react-native-reanimated';
import { ArrowLeft, Edit3, Trash2, AlertTriangle, Brain } from 'lucide-react-native';

import { useScanStore } from '../../store/scanStore';
import { scanAPI, glucoseAPI, getApiErrorMessage } from '../../services/api';
import { useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADII, TYPE } from '../../theme/tokens';

import { GlassCard } from '../../components/ui/GlassCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { NeonButton } from '../../components/ui/NeonButton';
import { GhostButton } from '../../components/ui/GhostButton';
import { ScanCorrectionModal } from '../../components/ui/ScanCorrectionModal';
import { MetricChip } from '../../components/ui/MetricChip';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { AITwinOrb } from '../../components/ui/AITwinOrb';

export default function ScanResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const viewOnly = params.viewOnly === 'true';
  const { scanResult, capturedImageUri, resetScan } = useScanStore();
  const queryClient = useQueryClient();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [twinState, setTwinState] = useState<'idle' | 'listening' | 'thinking' | 'data'>('idle');

  // Infer initial meal type
  const [selectedMealType, setSelectedMealType] = useState<string>(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 15) return 'lunch';
    if (hour >= 18 && hour < 23) return 'dinner';
    return 'snack';
  });

  const MEAL_TYPES = [
    { id: 'breakfast', label: 'Breakfast' },
    { id: 'lunch', label: 'Lunch' },
    { id: 'dinner', label: 'Dinner' },
    { id: 'snack', label: 'Snack' },
  ];

  // Drive twin animations based on scan result
  useEffect(() => {
    if (!scanResult) return;
    
    setTwinState('thinking');
    const t1 = setTimeout(() => setTwinState('data'), 400);
    const t2 = setTimeout(() => setTwinState('idle'), 2400);
    
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [scanResult]);

  if (!scanResult) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bgPage, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: COLORS.textOnLight }}>No scan result available.</Text>
        <NeonButton onPress={() => router.back()} style={{ marginTop: 20 }}>Go Back</NeonButton>
      </View>
    );
  }

  const handleDiscard = async () => {
    Alert.alert('Discard Scan', 'Are you sure you want to discard this scan?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await scanAPI.delete(scanResult.id);
            await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            resetScan();
            router.replace('/(app)/(tabs)/dashboard');
          } catch (e) {
            Alert.alert('Error', getApiErrorMessage(e, 'Failed to delete scan.'));
            setIsDeleting(false);
          }
        }
      }
    ]);
  };

  const handleClose = () => {
    resetScan();
    router.replace('/(app)/(tabs)/dashboard');
  };

  const handleLogMeal = async () => {
    if (isLogging) return;
    setIsLogging(true);
    try {
      await scanAPI.correct(scanResult.id, {
        meal_type: selectedMealType,
      } as any);

      // Automatically log the predicted glucose spike
      const spikeRisk = scanResult.glycemic_data?.estimated_spike_mg_dl || 0;
      if (spikeRisk > 0) {
        try {
          // Get the most recent glucose reading from dashboard cache
          const dashboardData: any = queryClient.getQueryData(['dashboard']);
          const recentGlucose = dashboardData?.recent_glucose?.[0]?.glucose_value_mg_dl || 100;
          const predictedGlucose = Math.round(recentGlucose + spikeRisk);
          
          await glucoseAPI.log({
            glucose_value_mg_dl: predictedGlucose,
            measurement_type: 'after_meal',
            notes: `AI Predicted spike (+${Math.round(spikeRisk)}) from ${scanResult.food_name || 'meal'}`
          });
        } catch (glucoseError) {
          console.error('Failed to log predicted glucose:', glucoseError);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['meals'] });
      await queryClient.invalidateQueries({ queryKey: ['scans'] });
      await queryClient.invalidateQueries({ queryKey: ['glucose'] });

      resetScan();
      router.replace('/(app)/(tabs)/dashboard');
    } catch (e: any) {
      console.error('Failed to log meal full error:', e);
      if (e.response) {
        console.error('Response data:', e.response.data);
      }
      Alert.alert('Error', getApiErrorMessage(e, 'Failed to log meal.'));
    } finally {
      setIsLogging(false);
    }
  };

  // Data mapping
  const safetyScore = scanResult.glycemic_data?.diabetes_safety_score || 0;
  const isHighRisk = scanResult.risk_level === 'high' || scanResult.risk_level === 'critical';
  const riskVariant = isHighRisk ? 'critical' : scanResult.risk_level === 'moderate' ? 'warning' : 'safe';
  const riskColor = riskVariant === 'critical' ? COLORS.danger : riskVariant === 'warning' ? COLORS.warning : COLORS.lime;

  const carbsG = scanResult.nutrition_data?.carbs_g || 0;
  const sugarG = scanResult.nutrition_data?.sugar_g || 0;
  const proteinG = scanResult.nutrition_data?.protein_g || 0;
  const fatG = scanResult.nutrition_data?.fat_g || 0;

  const gi = scanResult.glycemic_data?.glycemic_index || 0;
  const spikeRisk = scanResult.glycemic_data?.estimated_spike_mg_dl || 0;
  const spikePercent = Math.min(Math.max((spikeRisk / 80) * 100, 5), 100);

  const aiSummary = scanResult.recommendations?.[0] || (spikeRisk ? `Estimated spike: +${spikeRisk} mg/dL.` : 'No health insights available.');
  const servingSize = scanResult.serving_size || `${scanResult.estimated_weight_g}g`;

  return (
    <View style={styles.container}>
      {/* Background: scan image dimmed */}
      <View style={StyleSheet.absoluteFill}>
        <Image source={{ uri: scanResult.image_url }} style={StyleSheet.absoluteFillObject} />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(4,5,15,0.55)' }]} />
      </View>

      {/* Top Bar */}
      <SafeAreaView>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleClose} style={styles.navButton}>
            <ArrowLeft size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{viewOnly ? 'Meal Analysis' : 'Results'}</Text>
          {!viewOnly && (
            <TouchableOpacity onPress={() => setIsEditModalVisible(true)} style={styles.navButton}>
              <Edit3 size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* AI Twin presenter — small, above the sheet */}
        <View style={styles.twinContainer}>
          <AITwinOrb
            state={twinState}
            moodColor={riskColor}
            size={110}
          />
        </View>
      </SafeAreaView>

      {/* Bottom Sheet Content */}
      <Animated.View entering={SlideInDown.springify().damping(26).stiffness(200)} style={styles.sheetContainer}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
          <View style={styles.grabber} />

          {/* Food Header */}
          <Animated.View entering={FadeInUp.delay(100).springify().stiffness(280).damping(26)} style={styles.foodHeader}>
            {capturedImageUri || scanResult.image_url ? (
              <Image source={{ uri: capturedImageUri || scanResult.image_url }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, { backgroundColor: COLORS.bgCardAlt, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: COLORS.textOnLightFaint, fontSize: 10 }}>Manual</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.foodName}>{scanResult.food_name || 'Unknown Food'}</Text>
              <Text style={styles.foodDetails}>
                {servingSize} • {scanResult.nutrition_data?.calories} kcal
              </Text>
            </View>
            <StatusBadge variant={riskVariant}>{gi > 0 ? `GI - ${gi}` : (scanResult.risk_level || 'UNKNOWN').toUpperCase()}</StatusBadge>
          </Animated.View>

          {/* Fallback warning */}
          {(scanResult as any).is_estimate_fallback && (
            <Animated.View entering={FadeInUp.delay(150).springify().stiffness(280).damping(26)} style={styles.fallbackBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} color={COLORS.warning} strokeWidth={2} />
                <Text style={styles.fallbackTitle}>AI Analysis Unavailable</Text>
              </View>
              <Text style={styles.fallbackText}>Showing generic estimate. Review and correct if needed.</Text>
            </Animated.View>
          )}

          {/* Nutrition Grid */}
          <Animated.View entering={FadeInUp.delay(200).springify().stiffness(280).damping(26)} style={styles.macrosGrid}>
            <MetricChip label="Carbs"   value={`${carbsG}g`}   color={COLORS.warning} />
            <MetricChip label="Sugar"   value={`${sugarG}g`}   color={COLORS.danger} />
            <MetricChip label="Protein" value={`${proteinG}g`} color={COLORS.info} />
            <MetricChip label="Fat"     value={`${fatG}g`}     color="#B39DDB" />
          </Animated.View>

          {/* Meal Type Selector */}
          {!viewOnly && (
            <Animated.View entering={FadeInUp.delay(250).springify().stiffness(280).damping(26)} style={{ marginTop: 16 }}>
              <SectionLabel variant="subtle">Meal Type</SectionLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {MEAL_TYPES.map(mt => {
                  const isActive = selectedMealType === mt.id;
                  return (
                    <TouchableOpacity
                      key={mt.id}
                      onPress={() => setSelectedMealType(mt.id)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: RADII.chip,
                        backgroundColor: isActive ? COLORS.lime : COLORS.bgCardAlt,
                        borderWidth: 1,
                        borderColor: isActive ? COLORS.limePressed : COLORS.borderLight,
                      }}
                    >
                      <Text style={{ 
                        ...TYPE.button, 
                        fontSize: 13,
                        color: isActive ? COLORS.textOnLime : COLORS.textOnLight 
                      }}>
                        {mt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* Spike Risk */}
          <Animated.View entering={FadeInUp.delay(300).springify().stiffness(280).damping(26)} style={styles.spikeSection}>
            <View style={styles.spikeHeader}>
              <SectionLabel variant="subtle">Predicted Spike Risk</SectionLabel>
              <Text style={[styles.spikeRiskText, { color: riskColor }]}>
                {(scanResult.risk_level || 'moderate').toUpperCase()}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${spikePercent}%`, backgroundColor: riskColor }]} />
            </View>
          </Animated.View>

          {/* Diabetes Safety Score */}
          {safetyScore > 0 && (
            <Animated.View entering={FadeInUp.delay(400).springify().stiffness(280).damping(26)} style={styles.safetySection}>
              <Text style={styles.safetyLabel}>Safety Score</Text>
              <View style={[styles.progressBarBg, { flex: 1 }]}>
                <View style={[styles.progressBarFill, {
                  width: `${safetyScore}%`,
                  backgroundColor: safetyScore > 70 ? COLORS.lime : safetyScore > 40 ? COLORS.warning : COLORS.danger
                }]} />
              </View>
              <Text style={styles.safetyValue}>{safetyScore}/100</Text>
            </Animated.View>
          )}

          {/* AI Summary */}
          <Animated.View entering={FadeInUp.delay(500).springify().stiffness(280).damping(26)} style={{ marginTop: 12 }}>
            <GlassCard elevation={1} glow>
              <View style={styles.aiSummaryRow}>
                <Brain size={20} color={COLORS.lime} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiSummaryTitle}>AI Health Assessment</Text>
                  <Text style={styles.aiSummaryText}>{aiSummary}</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Recommendations */}
          {scanResult.recommendations && scanResult.recommendations.length > 1 && (
            <Animated.View entering={FadeInUp.delay(600).springify().stiffness(280).damping(26)} style={{ marginTop: 12 }}>
              <SectionLabel variant="subtle">Recommendations</SectionLabel>
              <View style={{ marginTop: 8, gap: 6 }}>
                {scanResult.recommendations.slice(1).map((rec, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ color: COLORS.lime }}>•</Text>
                    <Text style={{ color: COLORS.textOnLight, fontSize: 13 }}>{rec}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Alternatives */}
          {scanResult.alternatives && scanResult.alternatives.length > 0 && (
            <Animated.View entering={FadeInUp.delay(700).springify().stiffness(280).damping(26)} style={{ marginTop: 16 }}>
              <SectionLabel variant="subtle">Healthier Alternatives</SectionLabel>
              <View style={{ marginTop: 8, gap: 12 }}>
                {scanResult.alternatives.map((alt, i) => (
                  <GlassCard key={i} elevation={1}>
                    <Text style={styles.altName}>{alt.name}</Text>
                    <Text style={styles.altReason}>{alt.reason}</Text>
                  </GlassCard>
                ))}
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Fixed Action Bar */}
      {!viewOnly && (
        <View style={styles.actionBar}>
          <GhostButton onPress={handleDiscard} style={{ flex: 1 }} disabled={isDeleting}>
            {isDeleting ? 'Discarding...' : 'Discard'}
          </GhostButton>
          <View style={{ width: 12 }} />
          <NeonButton onPress={handleLogMeal} style={{ flex: 2 }} disabled={isLogging}>
            {isLogging ? 'Logging...' : 'Log Meal'}
          </NeonButton>
        </View>
      )}

      <ScanCorrectionModal
        visible={isEditModalVisible}
        scan={scanResult}
        onClose={() => setIsEditModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.bgPage },
  topBar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, zIndex: 10 },
  navButton:        { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle:      { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
  twinContainer:    { alignItems: 'center', marginTop: -12, zIndex: 5 },
  sheetContainer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, top: 240,
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADII.sheetTop, borderTopRightRadius: RADII.sheetTop,
    borderTopWidth: 1, borderColor: COLORS.borderLight,
    ...SHADOWS.cardOnLightRaised,
  },
  sheetScroll:      { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 12 },
  grabber:          { width: 44, height: 5, borderRadius: 3, backgroundColor: COLORS.borderLight, alignSelf: 'center', marginBottom: 16 },
  foodHeader:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumbnail:        { width: 56, height: 56, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderLight },
  foodName:         { ...TYPE.bodyStrong, fontSize: 16 },
  foodDetails:      { ...TYPE.caption, marginTop: 2 },
  fallbackBanner:   { backgroundColor: COLORS.warningDim, padding: 12, borderRadius: 12, marginTop: 16, borderWidth: 1, borderColor: 'rgba(245,166,35,0.30)' },
  fallbackTitle:    { color: '#9A6600', fontWeight: 'bold', fontSize: 13 },
  fallbackText:     { color: COLORS.textOnLightSoft, fontSize: 12, marginTop: 4 },
  macrosGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, justifyContent: 'space-between' },
  spikeSection:     { marginTop: 16 },
  spikeHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  spikeRiskText:    { fontSize: 12, fontWeight: 'bold' },
  progressBarBg:    { height: 10, borderRadius: 5, backgroundColor: COLORS.borderLight, overflow: 'hidden' },
  progressBarFill:  { height: '100%', borderRadius: 5 },
  safetySection:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  safetyLabel:      { ...TYPE.caption, fontWeight: '600' },
  safetyValue:      { ...TYPE.bodyStrong, fontSize: 13 },
  aiSummaryRow:     { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  aiSummaryTitle:   { color: COLORS.greenDeep, fontSize: 13, fontWeight: 'bold' },
  aiSummaryText:    { ...TYPE.body, fontSize: 12, marginTop: 4, lineHeight: 18 },
  altName:          { ...TYPE.bodyStrong, fontSize: 14, marginBottom: 4 },
  altReason:        { ...TYPE.body, fontSize: 12, lineHeight: 18 },
  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingBottom: 32, paddingTop: 16,
    backgroundColor: COLORS.bgCard,
    borderTopWidth: 1, borderColor: COLORS.borderLight,
    flexDirection: 'row',
  },
});
