import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Modal, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInUp, FadeIn, withRepeat, withTiming, withSequence, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { 
  Settings, Heart, Pill, Utensils, BarChart3, Activity, 
  Watch, Bell, Shield, Download, Globe, CreditCard, HelpCircle, 
  LogOut, Crown, TrendingUp, Camera, Award, Star, Edit3, ChevronRight,
  Flame, Target, Lock, Mail, User
} from 'lucide-react-native';

import { useAuthStore } from '../../../store/authStore';
import { authAPI, userAPI, healthAPI, scanAPI } from '../../../services/api';
import { COLORS, SHADOWS, TYPE } from '../../../theme/tokens';
import { GlassCard } from '../../../components/ui/GlassCard';
import { SectionLabel } from '../../../components/ui/SectionLabel';
import { NeonButton } from '../../../components/ui/NeonButton';

export default function ProfileScreen() {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);

  // Dynamic Data Fetching
  const { data: scoreData } = useQuery({ queryKey: ['healthScore'], queryFn: healthAPI.getScore });
  const { data: scanStats } = useQuery({ queryKey: ['scanStats'], queryFn: scanAPI.stats });
  const { data: healthProfile } = useQuery({ queryKey: ['healthProfile'], queryFn: userAPI.getHealthProfile });
  
  const userName = (user?.user_metadata as any)?.full_name || user?.email?.split('@')[0] || 'User';
  const healthScore = scoreData?.score ?? 0;
  const totalScans = scanStats?.total_scans ?? 0;
  
  // Directly wired to backend
  const streak = scoreData?.streak ?? 0;
  const badgesCount = scoreData?.badges_count ?? 0;

  // Profile metadata
  const age = healthProfile?.age || 'Age Unknown';
  const diabetesType = healthProfile?.diabetes_type 
    ? healthProfile.diabetes_type.replace(/type1/i, 'Type 1').replace(/type2/i, 'Type 2') 
    : 'Diabetes Type Not Set';
    
  const medications = healthProfile?.medications || [];

  const initials = userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

  const dynamicStats = [
    { label: 'Streak', value: `${streak}d`, icon: <TrendingUp size={14} color={COLORS.neon} />, color: COLORS.neon },
    { label: 'Scans', value: `${totalScans}`, icon: <Camera size={14} color={COLORS.info} />, color: COLORS.info },
    { label: 'Score', value: `${healthScore}`, icon: <Activity size={14} color={COLORS.warning} />, color: COLORS.warning },
    { label: 'Badges', value: `${badgesCount}`, icon: <Award size={14} color="#B39DDB" />, color: '#B39DDB' },
  ];

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (e) {
      console.error(e);
    } finally {
      await clearAuth();
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Text style={styles.headerTitle}>Account</Text>
        </View>

        {/* Profile header card */}
        <Animated.View entering={FadeInUp.delay(100).springify().stiffness(280).damping(26)} style={{ marginTop: 16 }}>
           <GlassCard elevation={3}>
              <View style={styles.profileRow}>
                 <AnimatedAvatar initials={initials} />
                 
                 <View style={styles.profileInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.nameText}>{userName}</Text>
                        <Crown size={14} color={COLORS.lime} />
                     </View>
                    <Text style={styles.userDesc}>{diabetesType} • {age}</Text>
                    
                    <View style={styles.medsRow}>
                       {medications.length > 0 ? (
                         medications.map((med: string, i: number) => (
                           <View key={i} style={styles.medPill}>
                              <Text style={styles.medPillText}>{med}</Text>
                           </View>
                         ))
                       ) : (
                         <View style={[styles.medPill, { borderColor: COLORS.borderLight, backgroundColor: 'transparent' }]}>
                            <Text style={[styles.medPillText, { color: COLORS.textTertiary }]}>No meds listed</Text>
                         </View>
                       )}
                    </View>
                 </View>
                 
                 <TouchableOpacity style={styles.editButton} onPress={() => setEditModalVisible(true)}>
                    <Edit3 size={14} color={COLORS.textOnLight} />
                 </TouchableOpacity>
              </View>
           </GlassCard>
        </Animated.View>

        {/* Stats Grid */}
        <Animated.View entering={FadeInUp.delay(200).springify().stiffness(280).damping(26)} style={styles.statsGrid}>
           {dynamicStats.map((s, i) => (
             <View key={s.label} style={styles.statCardContainer}>
                <GlassCard elevation={1} style={styles.statCard}>
                   <View style={[styles.statIconContainer, { backgroundColor: `${s.color}15` }]}>
                      {s.icon}
                   </View>
                   <Text style={styles.statValue}>{s.value}</Text>
                   <Text style={styles.statLabel}>{s.label}</Text>
                </GlassCard>
             </View>
           ))}
        </Animated.View>

        {/* Profile Management Menu */}
        <Animated.View entering={FadeInUp.delay(300).springify().stiffness(280).damping(26)} style={styles.sectionContainer}>
           <SectionLabel icon={<Settings size={12} color={COLORS.neon} />}>Profile Management</SectionLabel>
           <View style={styles.menuCard}>
             
             {/* Readonly Email */}
             <View style={styles.menuRow}>
               <View style={styles.menuIconBox}>
                 <Mail size={16} color={COLORS.textSecondary} />
               </View>
               <View style={styles.menuTextCol}>
                 <Text style={styles.menuLabel}>Email Address</Text>
                 <Text style={styles.menuValue}>{user?.email || 'N/A'}</Text>
               </View>
             </View>
             <View style={styles.menuDivider} />

             {/* Editable Name */}
             <TouchableOpacity style={styles.menuRow} onPress={() => setEditModalVisible(true)}>
               <View style={styles.menuIconBox}>
                 <User size={16} color={COLORS.textSecondary} />
               </View>
               <View style={styles.menuTextCol}>
                 <Text style={styles.menuLabel}>Full Name</Text>
                 <Text style={styles.menuValue}>{userName}</Text>
               </View>
               <ChevronRight size={16} color={COLORS.textTertiary} />
             </TouchableOpacity>
             <View style={styles.menuDivider} />

             {/* Change Password */}
             <TouchableOpacity style={styles.menuRow} onPress={() => setPasswordModalVisible(true)}>
               <View style={styles.menuIconBox}>
                 <Lock size={16} color={COLORS.textSecondary} />
               </View>
               <View style={styles.menuTextCol}>
                 <Text style={styles.menuLabel}>Password</Text>
                 <Text style={styles.menuValue}>••••••••</Text>
               </View>
               <Text style={styles.menuActionText}>Change</Text>
               <ChevronRight size={16} color={COLORS.textTertiary} />
             </TouchableOpacity>

           </View>
        </Animated.View>

        {/* Sign Out */}
        <Animated.View entering={FadeInUp.delay(600).springify().stiffness(280).damping(26)} style={styles.signOutContainer}>
           <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
              <LogOut size={16} color={COLORS.danger} />
              <Text style={styles.signOutText}>Sign Out</Text>
           </TouchableOpacity>
        </Animated.View>

      </ScrollView>
      
      {/* Edit Profile Modal */}
      <EditProfileModal 
        visible={isEditModalVisible} 
        onClose={() => setEditModalVisible(false)} 
        currentProfile={healthProfile}
        currentName={userName}
        onSuccess={() => {
          setEditModalVisible(false);
          queryClient.invalidateQueries({ queryKey: ['healthProfile'] });
          queryClient.invalidateQueries({ queryKey: ['user'] });
        }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal 
        visible={isPasswordModalVisible} 
        onClose={() => setPasswordModalVisible(false)} 
        onSuccess={() => {
          setPasswordModalVisible(false);
          Alert.alert("Password Updated", "Please sign in again with your new password.");
          handleLogout();
        }}
      />
    </View>
  );
}

// ────────────────────────────────────────────────────────────
// MODALS
// ────────────────────────────────────────────────────────────

function EditProfileModal({ visible, onClose, currentProfile, currentName, onSuccess }: any) {
  const [name, setName] = useState(currentName);
  const [age, setAge] = useState(currentProfile?.age?.toString() || '');
  const [diabetesType, setDiabetesType] = useState(currentProfile?.diabetes_type || 'type2');
  const [meds, setMeds] = useState(currentProfile?.medications?.join(', ') || '');
  
  const updateMutation = useMutation({
    mutationFn: async () => {
      // 1. Update core user (name)
      await userAPI.update({ full_name: name });
      // 2. Update health profile
      const medications = meds.split(',').map((m: string) => m.trim()).filter(Boolean);
      await userAPI.upsertHealthProfile({ 
        age: parseInt(age) || undefined, 
        diabetes_type: diabetesType,
        medications
      });
    },
    onSuccess: onSuccess,
    onError: (err: any) => Alert.alert('Update Failed', err.message)
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Profile</Text>
          
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />
          
          <Text style={styles.inputLabel}>Age</Text>
          <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" />
          
          <Text style={styles.inputLabel}>Diabetes Type (type1, type2, prediabetes)</Text>
          <TextInput style={styles.input} value={diabetesType} onChangeText={setDiabetesType} autoCapitalize="none" />
          
          <Text style={styles.inputLabel}>Medications (comma separated)</Text>
          <TextInput style={styles.input} value={meds} onChangeText={setMeds} />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <NeonButton onPress={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </NeonButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ChangePasswordModal({ visible, onClose, onSuccess }: any) {
  const [password, setPassword] = useState('');
  
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");
      await userAPI.update({ password });
    },
    onSuccess: onSuccess,
    onError: (err: any) => Alert.alert('Update Failed', err.message)
  });

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Change Password</Text>
          
          <Text style={styles.inputLabel}>New Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <NeonButton onPress={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update'}
            </NeonButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AnimatedAvatar({ initials }: { initials: string }) {
  const glowOpacity = useSharedValue(0.2);
  React.useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500 }),
        withTiming(0.2, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({ shadowOpacity: glowOpacity.value }));
  return (
    <View style={styles.avatarWrapper}>
      <Animated.View style={[styles.avatarGlow, animatedStyle]}>
         <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
         </View>
      </Animated.View>
      <View style={styles.onlineDot} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPage },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 120 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 60 },
  headerTitle: { color: COLORS.textOnLight, fontSize: 24, fontWeight: 'bold' },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgCardAlt, borderWidth: 1.5, borderColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarWrapper: { position: 'relative' },
  avatarGlow: { shadowColor: COLORS.greenDeep, shadowOffset: { width: 0, height: 0 }, shadowRadius: 20, elevation: 10 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: `${COLORS.greenDeep}20`, borderWidth: 3, borderColor: COLORS.greenDeep, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: COLORS.greenDeep, fontSize: 24, fontWeight: 'bold' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.greenDeep, borderWidth: 3, borderColor: COLORS.bgCard, ...SHADOWS.limeButtonGlow },
  profileInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameText: { color: COLORS.textOnLight, fontSize: 18, fontWeight: 'bold' },
  userDesc: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  medsRow: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap', gap: 4 },
  medPill: { backgroundColor: COLORS.limeSoft, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: COLORS.greenDeep },
  medPillText: { color: COLORS.greenDeep, fontSize: 10, fontWeight: 'bold' },
  editButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bgCardAlt, borderWidth: 1.5, borderColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginTop: 16 },
  statCardContainer: { width: '25%', padding: 4 },
  statCard: { padding: 10, alignItems: 'center' },
  statIconContainer: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { color: COLORS.textOnLight, fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: COLORS.textTertiary, fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 4 },
  sectionContainer: { marginTop: 24 },
  achievementsScroll: { gap: 8, paddingVertical: 8 },
  achievementCard: { width: 92, padding: 12, alignItems: 'center' },
  achievementIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  achievementText: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  signOutContainer: { marginTop: 24, marginBottom: 24 },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, backgroundColor: 'rgba(255,77,106,0.08)', borderWidth: 1.5, borderColor: COLORS.danger, borderRadius: 16 },
  signOutText: { color: COLORS.danger, fontSize: 14, fontWeight: 'bold' },
  
  // Menu styles
  menuCard: { backgroundColor: COLORS.bgCard, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderLight, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  menuIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.bgCardAlt, alignItems: 'center', justifyContent: 'center' },
  menuTextCol: { flex: 1, gap: 2 },
  menuLabel: { color: COLORS.textTertiary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  menuValue: { color: COLORS.textOnLight, fontSize: 15, fontWeight: '500' },
  menuActionText: { color: COLORS.lime, fontSize: 12, fontWeight: 'bold' },
  menuDivider: { height: 1, backgroundColor: COLORS.borderLight, marginLeft: 60 },
  
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.bgPage, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: COLORS.borderLight },
  modalTitle: { ...TYPE.h2, marginBottom: 16 },
  inputLabel: { ...TYPE.caption, marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: COLORS.bgCardAlt, borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: 8, padding: 12, ...TYPE.body },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 12 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16, justifyContent: 'center' },
  cancelBtnText: { ...TYPE.bodyStrong, color: COLORS.textSecondary }
});
