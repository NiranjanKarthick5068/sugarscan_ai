import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet, RefreshControl, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Settings, Sparkles, Droplet, Brain, Activity } from 'lucide-react-native';
import { CartesianChart, Line, useChartPressState } from 'victory-native';
import { Circle } from '@shopify/react-native-skia';
import Svg, { Polyline, Polygon, Circle as SvgCircle, Text as SvgText, Line as SvgLine, Defs, LinearGradient, Stop } from 'react-native-svg';

import { healthAPI, dashboardAPI, analyticsAPI } from '../../../services/api';
import { COLORS, SHADOWS, TYPE } from '../../../theme/tokens';
import { AITwinOrb } from '../../../components/ui/AITwinOrb';
import { GlassCard } from '../../../components/ui/GlassCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { SectionLabel } from '../../../components/ui/SectionLabel';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { NeonButton } from '../../../components/ui/NeonButton';

export default function ChatScreen() {
  const router = useRouter();

  const {
    data: scoreData, isLoading: scoreLoading,
    refetch: refetchScore, isRefetching: isRefetchingScore,
  } = useQuery({ queryKey: ['healthScore'], queryFn: healthAPI.getScore });

  const {
    data: insightsData, isLoading: insightsLoading,
    refetch: refetchInsights, isRefetching: isRefetchingInsights,
  } = useQuery({ queryKey: ['healthInsights'], queryFn: healthAPI.getInsights });

  const {
    data: dashData, refetch: refetchDash, isRefetching: isRefetchingDash,
  } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardAPI.get });
  
  const {
    data: trendsData, isLoading: trendsLoading,
    refetch: refetchTrends, isRefetching: isRefetchingTrends,
  } = useQuery({ queryKey: ['aiTwinTrends'], queryFn: analyticsAPI.getAITwinTrends });

  const onRefresh = () => { refetchScore(); refetchInsights(); refetchDash(); refetchTrends(); };
  const isRefreshing = isRefetchingScore || isRefetchingInsights || isRefetchingDash || isRefetchingTrends;

  const targetScore    = scoreData?.score ?? null;
  const scoreSummary   = scoreData?.summary ?? 'Processing Data';
  const apiPredictions = insightsData?.predictions || [];
  const currentGlucose = dashData?.glucose?.avg ?? null;

  const [score, setScore] = useState(0);
  useEffect(() => {
    if (targetScore !== null) setScore(targetScore);
  }, [targetScore]);

  const [twinState, setTwinState] = useState<'idle' | 'listening' | 'thinking' | 'data'>('idle');

  useEffect(() => {
    if (scoreLoading || insightsLoading || trendsLoading) {
      setTwinState('thinking');
    } else {
      setTwinState('idle');
    }
  }, [scoreLoading, insightsLoading, trendsLoading]);

  // Realtime Subscriptions
  useEffect(() => {
    const { supabase } = require('../../../lib/supabase');
    const user = require('../../../store/authStore').useAuthStore.getState().user;
    
    const mealSub = supabase.channel('chat_meals')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meal_scans', filter: `user_id=eq.${user?.id}` }, () => {
        onRefresh();
      }).subscribe();

    const glucoseSub = supabase.channel('chat_glucose')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'glucose_readings', filter: `user_id=eq.${user?.id}` }, () => {
        onRefresh();
      }).subscribe();

    return () => {
      mealSub.unsubscribe();
      glucoseSub.unsubscribe();
    };
  }, []);

  const moodColor = targetScore !== null 
    ? (targetScore >= 70 ? COLORS.lime : targetScore >= 40 ? COLORS.warning : COLORS.danger)
    : COLORS.lime;

  const predictions = apiPredictions.map((p: any) => ({
    text: p.text,
    risk: p.risk === 'high' ? 'critical' as const : p.risk === 'medium' ? 'warning' as const : 'safe' as const,
    label: p.risk === 'high' ? 'High' : p.risk === 'medium' ? 'Medium' : 'Low',
  }));
  
  const trends = trendsData?.trends || [];
  const { state } = useChartPressState({ x: 0, y: { actual: 0, predicted: 0 } });

  const renderChart = () => {
    if (trendsLoading) {
      return <LoadingSkeleton variant="card" width="100%" height={200} />;
    }
    
    if (trends.length > 0) {
      if (Platform.OS === 'web') {
        const height = 200;
        const width = 300; // approximate width for web card
        const maxVal = Math.max(...trends.map(t => Math.max(t.actual, t.predicted))) * 1.1;
        const minVal = Math.min(...trends.map(t => Math.min(t.actual, t.predicted))) * 0.9;
        
        const range = maxVal - minVal;
        const safeRange = range === 0 ? 1 : range;
        
        const getY = (val: number) => height - ((val - minVal) / safeRange) * height;
        const getX = (index: number) => trends.length > 1 ? (index / (trends.length - 1)) * width : width / 2;
        
        const actualPoints = trends.map((t, i) => `${getX(i)},${getY(t.actual)}`).join(' ');
        const predictedPoints = trends.map((t, i) => `${getX(i)},${getY(t.predicted)}`).join(' ');

        const actualArea = `${getX(0)},${height} ${actualPoints} ${getX(trends.length - 1)},${height}`;
        const predictedArea = `${getX(0)},${height} ${predictedPoints} ${getX(trends.length - 1)},${height}`;
        
        return (
          <View style={{ height: 200, width: '100%', alignItems: 'center' }}>
            <Svg height="100%" width="100%" viewBox={`0 0 ${width} ${height}`}>
              <Defs>
                <LinearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={COLORS.lime} stopOpacity="0.4" />
                  <Stop offset="1" stopColor={COLORS.lime} stopOpacity="0" />
                </LinearGradient>
                <LinearGradient id="predictedGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={COLORS.warning} stopOpacity="0.3" />
                  <Stop offset="1" stopColor={COLORS.warning} stopOpacity="0" />
                </LinearGradient>
              </Defs>

              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                 <SvgLine key={i} x1="0" y1={height * pct} x2={width} y2={height * pct} stroke={COLORS.borderLight} strokeWidth="1" strokeDasharray="4,4" />
              ))}
              
              <Polygon points={actualArea} fill="url(#actualGrad)" />
              <Polygon points={predictedArea} fill="url(#predictedGrad)" />

              <Polyline points={actualPoints} fill="none" stroke={COLORS.lime} strokeWidth="3" />
              <Polyline points={predictedPoints} fill="none" stroke={COLORS.warning} strokeWidth="3" strokeDasharray="5, 5" />
              
              {trends.map((t, i) => (
                <React.Fragment key={i}>
                  <SvgCircle cx={getX(i)} cy={getY(t.actual)} r="5" fill={COLORS.bgCard} stroke={COLORS.lime} strokeWidth="2" />
                  <SvgCircle cx={getX(i)} cy={getY(t.predicted)} r="5" fill={COLORS.bgCard} stroke={COLORS.warning} strokeWidth="2" />
                </React.Fragment>
              ))}
            </Svg>
          </View>
        );
      }

      return (
        <CartesianChart
          data={trends}
          xKey="day"
          yKeys={["actual", "predicted"]}
          domainPadding={{ left: 20, right: 20, top: 20, bottom: 20 }}
          chartPressState={state}
          axisOptions={{
            font: undefined,
            tickCount: 5,
            lineColor: COLORS.borderLight,
            labelColor: COLORS.textTertiary,
          }}
        >
          {({ points }) => (
            <>
              <Line points={points.actual} color={COLORS.lime} strokeWidth={3} animate={{ type: "timing", duration: 500 }} />
              <Line points={points.predicted} color={COLORS.warning} strokeWidth={3} strokeDasharray={[5, 5]} animate={{ type: "timing", duration: 500 }} />
              {state.isActive && (
                 <>
                   <Circle cx={state.x.position} cy={state.y.actual.position} r={6} color={COLORS.lime} />
                   <Circle cx={state.x.position} cy={state.y.predicted.position} r={6} color={COLORS.warning} />
                 </>
              )}
            </>
          )}
        </CartesianChart>
      );
    }
    
    return <EmptyState compact title="No Data" message="Start tracking to see trends." />;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPage} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.lime} />}
      >
        {/* ─── Top bar ─── */}
        <Animated.View entering={FadeInDown.delay(60).springify().stiffness(280).damping(26)} style={styles.topBar}>
          <View>
            <Text style={styles.title}>AI Health Twin</Text>
            <View style={styles.subtitleRow}>
              <Sparkles size={12} color={COLORS.greenDeep} />
              <Text style={styles.subtitleText}>Your personalized metabolic intelligence</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.settingsButton}>
            <Settings size={18} color={COLORS.textOnLight} />
          </TouchableOpacity>
        </Animated.View>

        {/* ─── 3D AI Twin ─── */}
        <Animated.View entering={FadeInDown.delay(120)} style={styles.avatarContainer}>
          <View style={styles.avatarBg} />
          <AITwinOrb state={twinState} moodColor={moodColor} size={280} />

          {currentGlucose !== null && (
            <Animated.View entering={FadeInDown.delay(800).springify().stiffness(280).damping(26)} style={styles.floatingCard}>
              <View style={[styles.floatingDot, { backgroundColor: COLORS.lime }]} />
              <Droplet size={11} color={COLORS.greenDeep} />
              <Text style={styles.floatingText}>Glucose {Math.round(currentGlucose)}</Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* ─── Health Score Ring ─── */}
        <Animated.View entering={FadeInDown.delay(240).springify().stiffness(280).damping(26)} style={styles.scoreContainer}>
          {scoreLoading ? (
            <LoadingSkeleton variant="circle" width={140} height={140} />
          ) : (
            <>
              <View style={styles.scoreRing}>
                <View style={styles.scoreContent}>
                  <Text style={styles.scoreValue}>{targetScore !== null ? Math.round(score) : '—'}</Text>
                  <Text style={styles.scoreMax}>/100</Text>
                </View>
              </View>
              <Text style={styles.scoreLabel}>Health Score</Text>
              {targetScore !== null && (
                <View style={{ marginTop: 8 }}>
                  <StatusBadge variant="safe">{scoreSummary}</StatusBadge>
                </View>
              )}
            </>
          )}
        </Animated.View>
        
        {/* ─── Analytics Graph (Dynamic) ─── */}
        <Animated.View entering={FadeInDown.delay(280).springify().stiffness(280).damping(26)} style={styles.graphContainer}>
          <SectionLabel icon={<Activity size={12} />}>Trend Analysis</SectionLabel>
          <GlassCard elevation={2} style={styles.graphCard}>
             <Text style={styles.graphTitle}>Actual vs. Predicted Glucose</Text>
             <View style={styles.chartWrapper}>
               {renderChart()}
             </View>
             
             {/* Legend */}
             <View style={styles.legendContainer}>
               <View style={styles.legendItem}>
                 <View style={[styles.legendColor, { backgroundColor: COLORS.lime }]} />
                 <Text style={styles.legendText}>Actual</Text>
               </View>
               <View style={styles.legendItem}>
                 <View style={[styles.legendColor, { backgroundColor: COLORS.warning }]} />
                 <Text style={styles.legendText}>Predicted (AI)</Text>
               </View>
             </View>
          </GlassCard>
        </Animated.View>

        {/* ─── AI Predictions ─── */}
        <Animated.View entering={FadeInDown.delay(300).springify().stiffness(280).damping(26)} style={styles.predictionsContainer}>
          <SectionLabel icon={<Brain size={12} />}>AI Predictions</SectionLabel>

          {insightsLoading ? (
            <View style={styles.predictionsRow}>
              <LoadingSkeleton variant="card" width={185} height={120} />
              <View style={{ width: 12 }} />
              <LoadingSkeleton variant="card" width={185} height={120} />
            </View>
          ) : predictions.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.predictionsScroll}>
              {predictions.map((p: any, i: number) => (
                <GlassCard key={i} elevation={2} style={styles.predictionCard}>
                  <View style={styles.predictionIconBox}>
                    <Sparkles size={18} color={COLORS.greenDeep} strokeWidth={2} />
                  </View>
                  <Text style={styles.predictionText}>{p.text}</Text>
                  <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                    <StatusBadge variant={p.risk}>{p.label} Risk</StatusBadge>
                  </View>
                </GlassCard>
              ))}
            </ScrollView>
          ) : (
            <EmptyState
              compact
              title="No Predictions Available"
              message="More data is needed to generate accurate health predictions."
            />
          )}
        </Animated.View>

        {/* ─── Chat CTA ─── */}
        <Animated.View entering={FadeInDown.delay(360).springify().stiffness(280).damping(26)} style={styles.chatButtonContainer}>
          <NeonButton
            onPress={() => {
              router.push('/(app)/conversation');
            }}
            size="lg"
          >
            Chat with AI Twin
          </NeonButton>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: COLORS.bgPage },
  scrollContent:     { paddingBottom: 120 },
  topBar:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginTop: 60 },
  title:             { ...TYPE.h1 },
  subtitleRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  subtitleText:      { ...TYPE.caption, color: COLORS.greenDeep, fontStyle: 'italic' },
  settingsButton:    { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center', ...SHADOWS.elevation1 },
  avatarContainer:   { alignItems: 'center', marginTop: 12, height: 300, justifyContent: 'center', position: 'relative' },
  avatarBg:          { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: COLORS.limeDim },
  floatingCard:      { position: 'absolute', bottom: 20, left: 24, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: 12, ...SHADOWS.elevation1 },
  floatingDot:       { width: 6, height: 6, borderRadius: 3 },
  floatingText:      { ...TYPE.caption, color: COLORS.textOnLight, fontWeight: '600' },
  scoreContainer:    { alignItems: 'center', marginTop: 8 },
  scoreRing:         { width: 140, height: 140, borderRadius: 70, borderWidth: 6, borderColor: COLORS.lime, alignItems: 'center', justifyContent: 'center', ...SHADOWS.limeButtonGlow },
  scoreContent:      { flexDirection: 'row', alignItems: 'baseline' },
  scoreValue:        { ...TYPE.display, fontSize: 38, fontWeight: '900' },
  scoreMax:          { ...TYPE.caption, marginLeft: 2, alignSelf: 'flex-end', marginBottom: 4 },
  scoreLabel:        { ...TYPE.caption, textTransform: 'uppercase', letterSpacing: 1, marginTop: 10 },
  graphContainer:    { marginTop: 32, paddingHorizontal: 24 },
  graphCard:         { padding: 16, marginTop: 12 },
  graphTitle:        { ...TYPE.bodyStrong, marginBottom: 12 },
  chartWrapper:      { height: 200, width: '100%' },
  legendContainer:   { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 },
  legendItem:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendColor:       { width: 12, height: 12, borderRadius: 6 },
  legendText:        { ...TYPE.caption },
  predictionsContainer: { marginTop: 32, paddingHorizontal: 24 },
  predictionsRow:    { flexDirection: 'row', marginTop: 12 },
  predictionsScroll: { paddingHorizontal: 24, gap: 12, marginTop: 12, marginHorizontal: -24 },
  predictionCard:    { width: 185, padding: 14 },
  predictionIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.limeDim, alignItems: 'center', justifyContent: 'center' },
  predictionText:    { ...TYPE.body, fontSize: 13, marginTop: 10, lineHeight: 18 },
  chatButtonContainer: { marginTop: 32, paddingHorizontal: 24 },
});
