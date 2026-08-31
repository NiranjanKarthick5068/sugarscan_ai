import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet,
  TextInput, RefreshControl, StatusBar,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { scanAPI, glucoseAPI } from '../../../services/api';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  Search, Filter, Utensils, Flame, Activity,
  ChevronRight, Droplet, Plus,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS, TYPE, RADII, getGlucoseStatusColor } from '../../../theme/tokens';
import { GlassCard } from '../../../components/ui/GlassCard';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { GlucoseEntryModal } from '../../../components/ui/GlucoseEntryModal';
import { ManualMealModal } from '../../../components/ui/ManualMealModal';
import { Alert } from 'react-native';
import { useScanStore } from '../../../store/scanStore';

export default function HistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [showGlucoseModal, setShowGlucoseModal] = useState(false);
  const [showManualMealModal, setShowManualMealModal] = useState(false);
  const store = useScanStore();

  const handleAddPress = () => {
    Alert.alert(
      'Add Entry',
      'What would you like to log?',
      [
        { text: 'Scan Meal (Camera)', onPress: () => router.push('/(app)/(tabs)/scan' as any) },
        { text: 'Log Meal Manually', onPress: () => setShowManualMealModal(true) },
        { text: 'Log Glucose', onPress: () => setShowGlucoseModal(true) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const {
    data: scans, isLoading: scansLoading,
    refetch: refetchScans, isRefetching: isRefetchingScans,
  } = useQuery({
    queryKey: ['scans'],
    queryFn: () => scanAPI.list(1, 100),
  });

  const {
    data: glucose, isLoading: glucoseLoading,
    refetch: refetchGlucose, isRefetching: isRefetchingGlucose,
  } = useQuery({
    queryKey: ['glucose'],
    queryFn: () => glucoseAPI.list(30),
  });

  const historyItems = useMemo(() => {
    const items: any[] = [];
    if (scans?.scans) {
      items.push(...scans.scans.map((s: any) => ({ ...s, _type: 'scan', _date: new Date(s.scanned_at) })));
    }
    if (glucose) {
      items.push(...glucose.map((g: any) => ({ ...g, _type: 'glucose', _date: new Date(g.measured_at) })));
    }
    return items.sort((a, b) => b._date.getTime() - a._date.getTime());
  }, [scans, glucose]);

  const filteredHistory = useMemo(() => {
    return historyItems.filter((item: any) => {
      // Filter by meal type / data type
      if (filter !== 'All') {
        if (filter === 'Glucose' && item._type !== 'glucose') return false;
        if (item._type === 'scan') {
          const hour = item._date.getHours();
          if (filter === 'Breakfast' && !(hour >= 5 && hour < 11)) return false;
          if (filter === 'Lunch'     && !(hour >= 11 && hour < 15)) return false;
          if (filter === 'Dinner'    && !(hour >= 15 && hour < 21)) return false;
          if (filter === 'Snacks'    && !(hour >= 21 || hour < 5)) return false;
        }
      }
      // Search filter
      if (searchText) {
        const q = searchText.toLowerCase();
        if (item._type === 'scan') {
          return (item.food_name || '').toLowerCase().includes(q);
        }
        return 'glucose'.includes(q);
      }
      return true;
    });
  }, [historyItems, filter, searchText]);

  const isLoading = scansLoading || glucoseLoading;
  const isRefreshing = isRefetchingScans || isRefetchingGlucose;
  const onRefresh = () => { refetchScans(); refetchGlucose(); };
  const filters = ['All', 'Glucose', 'Breakfast', 'Lunch', 'Dinner', 'Snacks'];

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    if (item._type === 'scan') {
      const risk = item.risk_level || 'unknown';
      const riskStyle =
        risk === 'high' || risk === 'critical'
          ? { c: COLORS.danger, l: 'High Spike' }
          : risk === 'moderate'
          ? { c: COLORS.warning, l: 'Med Spike' }
          : { c: COLORS.lime, l: 'Low Spike' };

      const timeStr = item._date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return (
        <Animated.View entering={FadeInUp.delay(index * 50).springify().stiffness(280).damping(26)} style={{ marginBottom: 10 }}>
          <GlassCard elevation={1} onPress={() => {
            store.setScanResult(item);
            store.setCapturedImageUri(null);
            router.push('/(app)/scan-result?viewOnly=true' as any);
          }}>
            <View style={styles.cardContent}>
              <View style={styles.thumbnailContainer}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.thumbnail} />
                ) : (
                  <View style={styles.thumbnailPlaceholder}>
                    <Utensils size={20} color={COLORS.textOnLightFaint} />
                  </View>
                )}
              </View>

              <View style={styles.itemInfo}>
                <View style={styles.itemHeaderRow}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.food_name || 'Scanned Meal'}</Text>
                  <Text style={styles.itemTime}>{timeStr}</Text>
                </View>

                <View style={styles.itemSubRow}>
                  <View style={styles.subItemBadge}>
                    <Flame size={10} color={COLORS.warning} />
                    <Text style={styles.subItemText}>{item.nutrition_data?.calories ?? '?'} kcal</Text>
                  </View>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.subItemText}>{item.nutrition_data?.carbs_g ?? '?'}g carbs</Text>
                </View>

                <View style={styles.badgesRow}>
                  <View style={[styles.statusPill, { backgroundColor: `${riskStyle.c}15`, borderColor: `${riskStyle.c}30` }]}>
                    <Text style={[styles.statusPillText, { color: riskStyle.c }]}>{riskStyle.l}</Text>
                  </View>
                  <View style={styles.scorePill}>
                    <Activity size={10} color={COLORS.textOnLightFaint} />
                    <Text style={styles.scorePillText}>{item.glycemic_data?.diabetes_safety_score ?? '?'} Score</Text>
                  </View>
                </View>
              </View>
              <ChevronRight size={18} color={COLORS.textOnLightFaint} />
            </View>
          </GlassCard>
        </Animated.View>
      );
    }

    // Glucose Item
    const timeStr = item._date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const mg = item.glucose_value_mg_dl;
    const glucoseColor = getGlucoseStatusColor(mg);

    return (
      <Animated.View entering={FadeInUp.delay(index * 50).springify().stiffness(280).damping(26)} style={{ marginBottom: 10 }}>
        <GlassCard elevation={1}>
          <View style={styles.cardContent}>
            <View style={[styles.thumbnailContainer, { backgroundColor: COLORS.limeDim }]}>
              <Droplet size={24} color={COLORS.greenDeep} />
            </View>
            <View style={styles.itemInfo}>
              <View style={styles.itemHeaderRow}>
                <Text style={styles.itemTitle}>Glucose Reading</Text>
                <Text style={styles.itemTime}>{timeStr}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                <Text style={{ color: glucoseColor, fontSize: 20, fontWeight: '800' }}>{mg}</Text>
                <Text style={{ color: COLORS.textOnLightFaint, fontSize: 12, marginLeft: 4 }}>mg/dL</Text>
              </View>
            </View>
            <ChevronRight size={18} color={COLORS.textOnLightFaint} />
          </View>
        </GlassCard>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPage} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.headerTitle}>History</Text>
        <TouchableOpacity
          onPress={handleAddPress}
          style={styles.addButton}
        >
          <Plus size={18} color={COLORS.textOnLime} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Search size={16} color={COLORS.textOnLightFaint} />
          <TextInput
            placeholder="Search..."
            placeholderTextColor={COLORS.textOnLightFaint}
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={16} color={COLORS.textOnLight} />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={styles.filtersWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={item => item}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
          renderItem={({ item }) => {
            const active = filter === item;
            return (
              <TouchableOpacity
                onPress={() => setFilter(item)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: 24, marginTop: 20, gap: 12 }}>
          <LoadingSkeleton variant="card" height={96} />
          <LoadingSkeleton variant="card" height={96} />
          <LoadingSkeleton variant="card" height={96} />
        </View>
      ) : filteredHistory.length === 0 ? (
        <View style={{ marginTop: 40, marginHorizontal: 24 }}>
          <EmptyState
            icon={<Utensils size={32} color={COLORS.lime} />}
            title="No History Found"
            message={filter === 'All' ? "You haven't recorded any data yet." : `No entries found for ${filter}.`}
          />
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item, index) => `${item._type}-${item.id || index}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.lime} />}
        />
      )}

      <GlucoseEntryModal visible={showGlucoseModal} onClose={() => setShowGlucoseModal(false)} />
      <ManualMealModal visible={showManualMealModal} onClose={() => setShowManualMealModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: COLORS.bgPage },
  topBar:               { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginTop: 60 },
  headerTitle:          { ...TYPE.h1 },
  addButton:            { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.lime, borderWidth: 0, alignItems: 'center', justifyContent: 'center', ...SHADOWS.limeButtonGlow },
  searchRow:            { flexDirection: 'row', paddingHorizontal: 24, gap: 8, marginTop: 20 },
  searchBar:            { flex: 1, height: 44, borderRadius: 12, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderLight, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, ...SHADOWS.elevation1 },
  searchInput:          { flex: 1, color: COLORS.textOnLight, fontSize: 13, height: '100%' },
  filterButton:         { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center', ...SHADOWS.elevation1 },
  filtersWrapper:       { marginTop: 16, height: 36 },
  filterChip:           { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADII.button, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderLight },
  filterChipActive:     { backgroundColor: COLORS.lime, borderColor: COLORS.lime },
  filterChipText:       { color: COLORS.textOnLightSoft, fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: COLORS.textOnLime },
  cardContent:          { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumbnailContainer:   { width: 64, height: 64, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgCardAlt },
  thumbnail:            { width: '100%', height: '100%' },
  thumbnailPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  itemInfo:             { flex: 1 },
  itemHeaderRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemTitle:            { ...TYPE.bodyStrong, flex: 1, marginRight: 8 },
  itemTime:             { ...TYPE.caption },
  itemSubRow:           { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  subItemBadge:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subItemText:          { ...TYPE.caption, color: COLORS.textOnLightSoft },
  dot:                  { ...TYPE.caption, color: COLORS.textOnLightFaint },
  badgesRow:            { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  statusPill:           { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1 },
  statusPillText:       { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  scorePill:            { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: COLORS.bgCardAlt, borderWidth: 1, borderColor: COLORS.borderLight },
  scorePillText:        { color: COLORS.textOnLightFaint, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
});
