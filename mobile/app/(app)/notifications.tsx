import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell } from 'lucide-react-native';
import { COLORS } from '../../theme/tokens';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GlassCard } from '../../components/ui/GlassCard';

export default function NotificationsScreen() {
  const router = useRouter();
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [reportsEnabled, setReportsEnabled] = useState(false);

  return (
    <View style={styles.container}>
      <AmbientBackground variant="default" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <GlassCard style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                 <Text style={styles.settingTitle}>Critical Alerts</Text>
                 <Text style={styles.settingDesc}>High/Low glucose warnings</Text>
              </View>
              <Switch 
                value={alertsEnabled} 
                onValueChange={setAlertsEnabled}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: COLORS.neonSoft }}
                thumbColor={alertsEnabled ? COLORS.neon : '#FFF'}
              />
            </View>
            <View style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 16, marginTop: 16 }]}>
              <View style={styles.settingInfo}>
                 <Text style={styles.settingTitle}>Weekly Reports</Text>
                 <Text style={styles.settingDesc}>Summary of your week</Text>
              </View>
              <Switch 
                value={reportsEnabled} 
                onValueChange={setReportsEnabled}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: COLORS.neonSoft }}
                thumbColor={reportsEnabled ? COLORS.neon : '#FFF'}
              />
            </View>
          </GlassCard>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDeep },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1, padding: 24 },
  settingCard: { padding: 16 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingInfo: { flex: 1, paddingRight: 16 },
  settingTitle: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  settingDesc: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
});
