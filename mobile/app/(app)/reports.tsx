import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, BarChart3, Download } from 'lucide-react-native';
import { COLORS } from '../../theme/tokens';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { NeonButton } from '../../components/ui/NeonButton';

export default function ReportsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <AmbientBackground variant="default" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Data & Reports</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <BarChart3 size={48} color={COLORS.info} style={{ marginBottom: 16 }} />
          <Text style={styles.title}>Weekly Analytics</Text>
          <Text style={styles.subtitle}>Generate and download a comprehensive PDF report of your glucose trends and scans.</Text>
          
          <NeonButton 
            onPress={() => alert("Downloading PDF report...")}
            style={{ marginTop: 32, width: '100%' }}
          >
            Export PDF Report
          </NeonButton>
          <TouchableOpacity style={styles.csvButton} onPress={() => alert("Exporting CSV...")}>
            <Download size={16} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
            <Text style={styles.csvText}>Download Raw Data (CSV)</Text>
          </TouchableOpacity>
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
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' },
  csvButton: { flexDirection: 'row', alignItems: 'center', marginTop: 24, padding: 12 },
  csvText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500' }
});
