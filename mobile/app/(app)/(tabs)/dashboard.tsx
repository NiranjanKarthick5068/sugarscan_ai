import React, { useState, useEffect, useMemo } from 'react';
import {
  View, ScrollView, Text, RefreshControl, TouchableOpacity,
  StyleSheet, Image, StatusBar,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  Bell, Activity, Droplet, Brain, AlertTriangle,
  Mic, TrendingUp, Heart, Zap, ChevronRight, Dna,
  Utensils, Flame, Plus
} from 'lucide-react-native';

import { dashboardAPI } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { COLORS, RADII, SPACING, SHADOWS, TYPE } from '../../../theme/tokens';
import { GlassCard } from '../../../components/ui/GlassCard';
import { SectionLabel } from '../../../components/ui/SectionLabel';
import { DateChip } from '../../../components/ui/DateChip';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { MetricChip } from '../../../components/ui/MetricChip';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { GlucoseLineChart } from '../../../components/charts/GlucoseLineChart';
import { NutritionBarChart } from '../../../components/charts/NutritionBarChart';
import { AnimatedNumber } from '../../../components/ui/AnimatedNumber';
import { GlucoseEntryModal } from '../../../components/ui/GlucoseEntryModal';

function getCurrentWeek() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - dayOfWeek + i);
    return { day: days[i] ?? '', date: d.getDate(), active: i === dayOfWeek };
  });
}

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardAPI.get,
    retry: 2,
    retryDelay: 1000,
  });

  const week = useMemo(() => getCurrentWeek(), []);

  const targetGlucose = data?.glucose?.avg ?? null;
  const healthScore   = data?.health_score?.score ?? null;
  const tir           = data?.glucose?.tir ?? null;
  const avgGlucose    = data?.glucose?.avg ?? null;
  const totalScans    = data?.scans?.total_scans ?? 0;
  const aiInsight     = data?.health_score?.summary || null;

  const glucoseTarget = 140;
  const [glucoseVal, setGlucoseVal] = useState(0);
  const [showGlucoseModal, setShowGlucoseModal] = useState(false);
  
  const nutritionChartData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const agg: Record<string, number> = {};
    if (data?.recent_scans) {
      data.recent_scans.forEach((s: any) => {
        const d = days[new Date(s.scanned_at).getDay()];
        agg[d] = (agg[d] || 0) + (s.nutrition_data?.carbs_g || 0);
      });
    }
    const result = Object.keys(agg).map(d => ({ day: d, carbs: agg[d], calories: 0 }));
    // fallback if no data
    if (result.length === 0) {
      return [{ day: 'Mon', carbs: 0, calories: 0 }];
    }
    return result;
  }, [data?.recent_scans]);
  
  useEffect(() => {
    if (targetGlucose !== null) setGlucoseVal(Math.round(targetGlucose));
  }, [targetGlucose]);

  // Realtime Data Subscription
  useEffect(() => {
    const { supabase } = require('../../../lib/supabase');
    const mealSub = supabase.channel('dashboard_meals')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meal_scans', filter: `user_id=eq.${user?.id}` }, () => {
        refetch();
      }).subscribe();

    const glucoseSub = supabase.channel('dashboard_glucose')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'glucose_readings', filter: `user_id=eq.${user?.id}` }, () => {
        refetch();
      }).subscribe();

    return () => {
      mealSub.unsubscribe();
      glucoseSub.unsubscribe();
    };
  }, [user?.id, refetch]);

  const status =
    targetGlucose === null
      ? { label: '—', variant: 'neutral' as const }
      : glucoseVal < glucoseTarget
      ? { label: 'Normal', variant: 'safe' as const }
      : glucoseVal < glucoseTarget + 40
      ? { label: 'Slightly High', variant: 'warning' as const }
      : { label: 'High', variant: 'critical' as const };

  const deviationFromTarget =
    targetGlucose !== null ? Math.round(targetGlucose - glucoseTarget) : null;

  const score = healthScore ?? 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const displayName = (user?.user_metadata as any)?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPage} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={COLORS.lime}
          />
        }
      >
        {/* ─── Top Bar ─── */}
        <Animated.View entering={FadeInDown.delay(60).springify().stiffness(280).damping(26)} style={styles.topBar}>
          <View style={styles.userInfo}>
            <TouchableOpacity style={styles.avatarButton}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.statusDot} />
            </TouchableOpacity>
            <View>
              <Text style={styles.greeting}>Good {greeting}, {displayName}</Text>
              <View style={styles.connectionStatus}>
                <View style={styles.connectionDot} />
                <Text style={styles.connectionText}>{data ? 'Connected' : 'Connecting...'}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.bellButton}>
            <Bell size={18} color={COLORS.textOnLight} />
          </TouchableOpacity>
        </Animated.View>

        {/* ─── Week Strip ─── */}
        <Animated.View entering={FadeInDown.delay(120).springify().stiffness(280).damping(26)} style={styles.weekStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 24 }}>
            {week.map((d) => <DateChip key={d.date} day={d.day} date={d.date} active={!!d.active} />)}
          </ScrollView>
        </Animated.View>

        {isLoading && !data ? (
          <View style={{ paddingHorizontal: 24, marginTop: 24, gap: 16 }}>
            <LoadingSkeleton variant="card" height={200} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <LoadingSkeleton variant="card" height={100} style={{ flex: 1 }} />
              <LoadingSkeleton variant="card" height={100} style={{ flex: 1 }} />
              <LoadingSkeleton variant="card" height={100} style={{ flex: 1 }} />
            </View>
          </View>
        ) : error ? (
          <EmptyState
            variant="error"
            message={(error as any)?.message || 'Failed to load dashboard'}
            onRetry={refetch}
            style={{ marginTop: 24, marginHorizontal: 24 }}
          />
        ) : (
          <>
            {/* ─── Hero Glucose Card ─── */}
            <Animated.View entering={FadeInDown.delay(180).springify().stiffness(280).damping(26)} style={styles.section}>
              <GlassCard elevation={2} glow onPress={() => router.push('/(tabs)/history' as any)}>
                <View style={styles.heroTop}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.cardLabel}>Current Glucose</Text>
                      <TouchableOpacity 
                        onPress={() => setShowGlucoseModal(true)}
                        style={{
                          backgroundColor: COLORS.lime, width: 22, height: 22, borderRadius: 11, 
                          alignItems: 'center', justifyContent: 'center',
                          ...SHADOWS.limeButtonGlow
                        }}
                      >
                        <Plus size={14} color={COLORS.textOnLime} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.glucoseValueRow}>
                      {targetGlucose !== null ? (
                        <>
                          <AnimatedNumber value={glucoseVal} style={styles.glucoseValue} stiffness={120} damping={16} />
                          <Text style={styles.glucoseUnit}>mg/dL</Text>
                        </>
                      ) : (
                        <Text style={styles.emptyValue}>—</Text>
                      )}
                    </View>
                    <View style={styles.statusRow}>
                      <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
                      {deviationFromTarget !== null && deviationFromTarget !== 0 && (
                        <View style={styles.deviation}>
                          <TrendingUp size={12} color={COLORS.textOnLightFaint} strokeWidth={2} />
                          <Text style={styles.deviationText}>
                            {deviationFromTarget > 0 ? `+${deviationFromTarget}` : deviationFromTarget} from target
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Health Score Ring */}
                  <View style={styles.scoreRing}>
                    {healthScore !== null ? (
                      <AnimatedNumber value={score} style={styles.scoreText} stiffness={100} damping={18} />
                    ) : (
                      <Text style={styles.scoreText}>—</Text>
                    )}
                    <Text style={styles.scoreLabel}>SCORE</Text>
                  </View>
                </View>

                {/* Sparkline */}
                {data?.recent_glucose && data.recent_glucose.length > 0 ? (
                  <View style={{ height: 56, marginTop: 12, marginHorizontal: -16 }}>
                    <GlucoseLineChart
                      readings={data.recent_glucose.slice(0, 8)}
                      targetMin={70}
                      targetMax={glucoseTarget}
                      height={56}
                    />
                  </View>
                ) : (
                  <Text style={styles.noDataText}>No glucose readings yet — tap to add one</Text>
                )}
              </GlassCard>
            </Animated.View>

            {/* ─── Stats Row ─── */}
            <Animated.View entering={FadeInDown.delay(240).springify().stiffness(280).damping(26)} style={styles.statsRow}>
              <MetricChip
                label="Time in Range"
                value={tir !== null ? `${tir}%` : 'No Data'}
                icon={<Droplet size={14} color={COLORS.lime} strokeWidth={2} />}
                color={COLORS.lime}
              />
              <MetricChip
                label="Avg Glucose"
                value={avgGlucose !== null ? `${avgGlucose}` : 'No Data'}
                icon={<Heart size={14} color={COLORS.info} strokeWidth={2} />}
                color={COLORS.info}
              />
              <MetricChip
                label="Total Scans"
                value={`${totalScans}`}
                icon={<Activity size={14} color={COLORS.warning} strokeWidth={2} />}
                color={COLORS.warning}
              />
            </Animated.View>

            {/* ─── Nutrition Analytics ─── */}
            <Animated.View entering={FadeInDown.delay(270).springify().stiffness(280).damping(26)} style={styles.section}>
              <GlassCard elevation={2}>
                <Text style={styles.cardLabel}>Weekly Carbs Analytics</Text>
                <View style={{ height: 180, marginTop: 12 }}>
                  <NutritionBarChart 
                    data={nutritionChartData} 
                    height={180} 
                  />
                </View>
              </GlassCard>
            </Animated.View>

            {/* ─── AI Insight Banner ─── */}
            {aiInsight && (
              <Animated.View entering={FadeInDown.delay(300).springify().stiffness(280).damping(26)} style={styles.section}>
                <GlassCard elevation={1} onPress={() => router.push('/(tabs)/chat' as any)}>
                  <View style={styles.insightRow}>
                    <View style={styles.insightIcon}>
                      <Brain size={20} color={COLORS.lime} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.insightTitle}>AI Health Insight</Text>
                      <Text style={styles.insightMessage}>{aiInsight}</Text>
                      
                      {/* RAG Citation */}
                      {data?.recent_scans?.[0]?.rag_sources && data.recent_scans[0].rag_sources.length > 0 && (
                        <View style={{ marginTop: 8, padding: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Text style={{ fontSize: 9, color: COLORS.textOnLightFaint, textTransform: 'uppercase', letterSpacing: 0.5 }}>Knowledge Grounded By (RAG)</Text>
                          <Text style={{ fontSize: 10, color: COLORS.textTertiary, marginTop: 2 }} numberOfLines={1}>
                            {data.recent_scans[0].rag_sources[0]}
                          </Text>
                        </View>
                      )}

                      <View style={styles.insightLinkRow}>
                        <Text style={styles.insightLinkText}>View Recommendations</Text>
                        <ChevronRight size={12} color={COLORS.lime} strokeWidth={2} />
                      </View>
                    </View>
                  </View>
                </GlassCard>
              </Animated.View>
            )}

            {/* ─── Recent Meals ─── */}
            {data?.recent_scans && data.recent_scans.length > 0 && (
              <Animated.View entering={FadeInDown.delay(360).springify().stiffness(280).damping(26)} style={{ marginTop: 24 }}>
                <View style={{ paddingHorizontal: 24 }}>
                  <Text style={styles.sectionTitle}>Recent Meals</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 24, gap: 12, paddingTop: 12, paddingBottom: 8 }}
                >
                  {data.recent_scans.slice(0, 5).map((scan: any, index: number) => {
                    const timeStr = new Date(scan.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const cals = scan.nutrition_data?.calories || '?';
                    return (
                      <GlassCard key={scan.id || index} elevation={1} style={styles.mealCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          {scan.image_url ? (
                            <Image source={{ uri: scan.image_url }} style={styles.mealThumb} />
                          ) : (
                            <View style={[styles.mealThumb, styles.mealThumbPlaceholder]}>
                              <Utensils size={16} color={COLORS.textOnLightFaint} />
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.mealName} numberOfLines={1}>{scan.food_name || 'Meal'}</Text>
                            <Text style={styles.mealTime}>{timeStr}</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Flame size={12} color={COLORS.warning} />
                          <Text style={styles.mealCals}>{cals} kcal</Text>
                        </View>
                      </GlassCard>
                    );
                  })}
                </ScrollView>
              </Animated.View>
            )}

            {/* ─── Quick Actions ─── */}
            <Animated.View entering={FadeInDown.delay(420).springify().stiffness(280).damping(26)} style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.quickActionsRow}>
                <GlassCard elevation={1} style={styles.actionCard} onPress={() => router.push('/(tabs)/chat' as any)}>
                  <View style={[styles.actionIconBg, { backgroundColor: COLORS.limeSoft }]}>
                    <Dna size={18} color={COLORS.greenDeep} strokeWidth={2} />
                  </View>
                  <Text style={styles.actionText}>AI Twin</Text>
                </GlassCard>
                <GlassCard elevation={1} style={styles.actionCard} onPress={() => router.push('/(app)/conversation' as any)}>
                  <View style={[styles.actionIconBg, { backgroundColor: COLORS.infoDim }]}>
                    <Mic size={18} color={COLORS.info} strokeWidth={2} />
                  </View>
                  <Text style={styles.actionText}>Voice AI</Text>
                </GlassCard>
                <GlassCard elevation={1} style={styles.actionCard} onPress={() => router.push('/(app)/emergency' as any)}>
                  <View style={[styles.actionIconBg, { backgroundColor: COLORS.dangerDim }]}>
                    <AlertTriangle size={18} color={COLORS.danger} strokeWidth={2} />
                  </View>
                  <Text style={styles.actionText}>Emergency</Text>
                </GlassCard>
              </View>
            </Animated.View>
          </>
        )}
      </ScrollView>
      <GlucoseEntryModal visible={showGlucoseModal} onClose={() => setShowGlucoseModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.bgPage },
  scrollContent:    { paddingBottom: 120 },
  topBar:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginTop: 60 },
  userInfo:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarButton:     { position: 'relative' },
  avatar:           { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.lime, alignItems: 'center', justifyContent: 'center' },
  avatarText:       { fontSize: 18, fontWeight: 'bold', color: COLORS.textOnLime },
  statusDot:        { position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.lime, borderWidth: 2, borderColor: COLORS.bgPage },
  greeting:         { ...TYPE.h2, color: COLORS.textOnLight },
  connectionStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  connectionDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.lime },
  connectionText:   { ...TYPE.caption },
  bellButton:       { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center', ...SHADOWS.elevation1 },
  weekStrip:        { marginTop: 20 },
  section:          { paddingHorizontal: 24, marginTop: 20 },
  sectionTitle:     { ...TYPE.h2, marginBottom: 12 },
  cardLabel:        { ...TYPE.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroTop:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  glucoseValueRow:  { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 },
  glucoseValue:     { ...TYPE.display, fontSize: 52, fontWeight: '900', color: COLORS.textOnLight },
  glucoseUnit:      { ...TYPE.caption },
  emptyValue:       { ...TYPE.h1, color: COLORS.textOnLightFaint },
  statusRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  deviation:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deviationText:    { ...TYPE.caption },
  scoreRing:        { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: COLORS.lime, alignItems: 'center', justifyContent: 'center', ...SHADOWS.limeButtonGlow },
  scoreText:        { fontSize: 22, fontWeight: '900', color: COLORS.textOnLight },
  scoreLabel:       { fontSize: 7, fontWeight: '700', letterSpacing: 1, color: COLORS.textOnLightFaint },
  noDataText:       { ...TYPE.caption, textAlign: 'center', marginTop: 10, paddingVertical: 12 },
  statsRow:         { flexDirection: 'row', gap: 10, paddingHorizontal: 24, marginTop: 16 },
  insightRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  insightIcon:      { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.limeDim, alignItems: 'center', justifyContent: 'center' },
  insightTitle:     { ...TYPE.bodyStrong },
  insightMessage:   { ...TYPE.body, marginTop: 4, lineHeight: 18 },
  insightLinkRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  insightLinkText:  { fontSize: 11, fontWeight: '600', color: COLORS.greenDeep },
  mealCard:         { width: 150, padding: 12 },
  mealThumb:        { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderLight },
  mealThumbPlaceholder: { backgroundColor: COLORS.bgCardAlt, alignItems: 'center', justifyContent: 'center' },
  mealName:         { ...TYPE.bodyStrong, fontSize: 13 },
  mealTime:         { ...TYPE.caption },
  mealCals:         { ...TYPE.caption, color: COLORS.textOnLightSoft },
  quickActionsRow:  { flexDirection: 'row', gap: 10 },
  actionCard:       { flex: 1, alignItems: 'center', paddingVertical: 16 },
  actionIconBg:     { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionText:       { ...TYPE.caption, fontWeight: '600', color: COLORS.textOnLight, textAlign: 'center' },
});
