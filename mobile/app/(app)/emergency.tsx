import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Switch, Alert, Linking, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ArrowLeft, Phone, AlertOctagon, ShieldAlert, Plus,
  Edit3, Trash2, MessageSquare, User, X,
} from 'lucide-react-native';

import { COLORS, RADII, SHADOWS, TYPE } from '../../theme/tokens';
import { GlassCard } from '../../components/ui/GlassCard';
import { NeonButton } from '../../components/ui/NeonButton';
import { emergencyContactSchema, EmergencyContactFormValues, RELATIONSHIP_LABELS } from '../../schemas/emergencyContact';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

// ─── Supabase CRUD helpers for emergency_contacts ────────────────────────────
const getContacts = async (userId: string) => {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

const saveContact = async (data: EmergencyContactFormValues & { id?: string; user_id: string }) => {
  if (data.id) {
    const { id, user_id, ...updates } = data;
    const { data: row, error } = await supabase
      .from('emergency_contacts')
      .update(updates as never)
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single();
    if (error) throw error;
    return row;
  } else {
    const { id: _id, ...insert } = data;
    const { data: row, error } = await supabase
      .from('emergency_contacts')
      .insert(insert as never)
      .select()
      .single();
    if (error) throw error;
    return row;
  }
};

const deleteContact = async ({ id, userId }: { id: string; userId: string }) => {
  const { error } = await supabase
    .from('emergency_contacts')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
};

const RELATIONSHIPS = ['spouse', 'parent', 'child', 'sibling', 'friend', 'doctor', 'other'] as const;

function ContactForm({ initial, userId, onClose }: { initial?: any; userId: string; onClose: () => void }) {
  const queryClient = useQueryClient();

  const { control, handleSubmit, formState: { errors, isValid } } = useForm<EmergencyContactFormValues>({
    resolver: zodResolver(emergencyContactSchema),
    defaultValues: initial ?? { relationship: 'friend', notify_on_critical: true, country_code: '+91' },
    mode: 'onChange',
  });

  const mutation = useMutation({
    mutationFn: (data: EmergencyContactFormValues) =>
      saveContact({ ...data, id: initial?.id, user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-contacts'] });
      onClose();
    },
    onError: (e: any) => Alert.alert('Error', e.message ?? 'Failed to save contact'),
  });

  return (
    <View style={formStyles.container}>
      <View style={formStyles.header}>
        <Text style={formStyles.title}>{initial ? 'Edit Contact' : 'Add Contact'}</Text>
        <TouchableOpacity onPress={onClose} style={formStyles.closeBtn}>
          <X size={20} color={COLORS.textOnLight} />
        </TouchableOpacity>
      </View>

      {/* Name */}
      <Text style={formStyles.label}>Name</Text>
      <Controller control={control} name="name" render={({ field }) => (
        <TextInput
          style={[formStyles.input, errors.name && formStyles.inputError]}
          placeholder="Full name" placeholderTextColor={COLORS.textOnLightFaint}
          value={field.value} onChangeText={field.onChange}
        />
      )} />
      {errors.name && <Text style={formStyles.errorText}>{errors.name.message}</Text>}

      {/* Phone */}
      <Text style={formStyles.label}>Phone Number</Text>
      <Controller control={control} name="phone" render={({ field }) => (
        <TextInput
          style={[formStyles.input, errors.phone && formStyles.inputError]}
          placeholder="+91 98765 43210" placeholderTextColor={COLORS.textOnLightFaint}
          value={field.value} onChangeText={field.onChange}
          keyboardType="phone-pad"
        />
      )} />
      {errors.phone && <Text style={formStyles.errorText}>{errors.phone.message}</Text>}

      {/* Relationship */}
      <Text style={formStyles.label}>Relationship</Text>
      <Controller control={control} name="relationship" render={({ field }) => (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
          {RELATIONSHIPS.map(rel => (
            <TouchableOpacity
              key={rel}
              onPress={() => field.onChange(rel)}
              style={[formStyles.relChip, field.value === rel && formStyles.relChipActive]}
            >
              <Text style={[formStyles.relChipText, field.value === rel && formStyles.relChipTextActive]}>
                {RELATIONSHIP_LABELS[rel]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )} />

      {/* Notify toggle */}
      <Controller control={control} name="notify_on_critical" render={({ field }) => (
        <View style={formStyles.toggleRow}>
          <View>
            <Text style={formStyles.toggleLabel}>Notify on critical glucose</Text>
            <Text style={formStyles.toggleSub}>Send SMS alert when glucose is dangerously high/low</Text>
          </View>
          <Switch
            value={field.value}
            onValueChange={field.onChange}
            trackColor={{ false: COLORS.borderLight, true: COLORS.lime }}
            thumbColor={COLORS.bgCard}
          />
        </View>
      )} />

      <NeonButton onPress={handleSubmit(d => mutation.mutate(d))} disabled={!isValid} loading={mutation.isPending}>
        {initial ? 'Save Changes' : 'Add Contact'}
      </NeonButton>
    </View>
  );
}

const formStyles = StyleSheet.create({
  container:        { padding: 24, backgroundColor: COLORS.bgCard, borderRadius: RADII.card },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title:            { ...TYPE.h2 },
  closeBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bgCardAlt, alignItems: 'center', justifyContent: 'center' },
  label:            { ...TYPE.caption, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input:            { backgroundColor: COLORS.bgCardAlt, borderWidth: 1.5, borderColor: COLORS.borderLight, borderRadius: RADII.md, paddingHorizontal: 14, paddingVertical: 12, ...TYPE.body, color: COLORS.textOnLight, marginBottom: 8 },
  inputError:       { borderColor: COLORS.danger },
  errorText:        { ...TYPE.caption, color: COLORS.danger, marginBottom: 8 },
  relChip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADII.button, backgroundColor: COLORS.bgCardAlt, borderWidth: 1, borderColor: COLORS.borderLight },
  relChipActive:    { backgroundColor: COLORS.lime, borderColor: COLORS.lime },
  relChipText:      { ...TYPE.caption, fontWeight: '600', color: COLORS.textOnLightSoft },
  relChipTextActive:{ color: COLORS.textOnLime },
  toggleRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16 },
  toggleLabel:      { ...TYPE.bodyStrong },
  toggleSub:        { ...TYPE.caption, marginTop: 2, flexWrap: 'wrap' },
});

export default function EmergencyAlertScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);
  const userId = user?.id ?? '';
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['emergency-contacts', userId],
    queryFn: () => getContacts(userId),
    enabled: !!userId,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteContact({ id, userId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['emergency-contacts', userId] }),
    onError: (e: any) => Alert.alert('Error', e.message ?? 'Failed to delete'),
  });

  const handleCall = (phone: string) => {
    const tel = phone.replace(/\s/g, '');
    Linking.openURL(`tel:${tel}`).catch(() => Alert.alert('Error', 'Could not open phone dialer.'));
  };

  const handleMessage = (phone: string) => {
    const tel = phone.replace(/\s/g, '');
    Linking.openURL(`sms:${tel}`).catch(() => Alert.alert('Error', 'Could not open messages.'));
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Remove Contact', `Remove ${name} from emergency contacts?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate({ id }) },
    ]);
  };

  const openEdit = (contact: any) => { setEditingContact(contact); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingContact(null); };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3A0000" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Emergency</Text>
          <TouchableOpacity
            onPress={() => { setEditingContact(null); setShowForm(true); }}
            style={styles.addButton}
          >
            <Plus size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* ─── Alert Header ─── */}
          <Animated.View entering={FadeInDown.delay(60)} style={styles.alertHeader}>
            <AlertOctagon size={52} color={COLORS.danger} />
            <Text style={styles.title}>Are you having a medical emergency?</Text>
            <Text style={styles.subtitle}>If you are experiencing severe symptoms, contact emergency services immediately.</Text>
          </Animated.View>

          {/* ─── Primary 911 Button ─── */}
          <Animated.View entering={FadeInDown.delay(120)}>
            <TouchableOpacity style={styles.primaryCallButton} onPress={() => handleCall('911')}>
              <Phone size={24} color="#FFF" />
              <Text style={styles.primaryCallText}>Call 911</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ─── Contact Form (inline) ─── */}
          {showForm && (
            <Animated.View entering={FadeInDown.delay(80)} style={{ marginBottom: 20 }}>
              <ContactForm initial={editingContact} userId={userId} onClose={closeForm} />
            </Animated.View>
          )}

          {/* ─── My Emergency Contacts ─── */}
          <Animated.View entering={FadeInDown.delay(180)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Emergency Contacts</Text>
              {!showForm && (
                <TouchableOpacity
                  onPress={() => { setEditingContact(null); setShowForm(true); }}
                  style={styles.sectionAddBtn}
                >
                  <Plus size={16} color={COLORS.danger} />
                  <Text style={styles.sectionAddText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>

            {isLoading ? (
              <ActivityIndicator color={COLORS.danger} style={{ marginTop: 20 }} />
            ) : contacts.length === 0 ? (
              <Text style={styles.emptyText}>No contacts added yet. Tap "Add" to add one.</Text>
            ) : (
              <View style={{ gap: 12 }}>
                {contacts.map((contact: any, i: number) => (
                  <Animated.View key={contact.id} entering={FadeInDown.delay(i * 60)}>
                    <GlassCard style={styles.contactCard}>
                      {/* Contact info */}
                      <View style={styles.contactRow}>
                        <View style={styles.contactIcon}>
                          <User size={20} color={COLORS.danger} />
                        </View>
                        <View style={styles.contactInfo}>
                          <Text style={styles.contactName}>{contact.name}</Text>
                          <Text style={styles.contactRelationship}>{RELATIONSHIP_LABELS[contact.relationship] || contact.relationship}</Text>
                          <Text style={styles.contactPhone}>{contact.phone}</Text>
                        </View>
                        <View style={styles.contactActions}>
                          <TouchableOpacity style={styles.actionBtn} onPress={() => handleCall(contact.phone)}>
                            <Phone size={18} color={COLORS.danger} />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.actionBtn} onPress={() => handleMessage(contact.phone)}>
                            <MessageSquare size={18} color={COLORS.info} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Divider */}
                      <View style={styles.divider} />

                      {/* Edit / Delete row */}
                      <View style={styles.editRow}>
                        {contact.notify_on_critical && (
                          <View style={styles.notifyBadge}>
                            <ShieldAlert size={11} color={COLORS.danger} />
                            <Text style={styles.notifyBadgeText}>Critical alerts on</Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }} />
                        <TouchableOpacity onPress={() => openEdit(contact)} style={styles.editBtn}>
                          <Edit3 size={15} color={COLORS.textOnLightSoft} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(contact.id, contact.name)} style={styles.editBtn}>
                          <Trash2 size={15} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>
                    </GlassCard>
                  </Animated.View>
                ))}
              </View>
            )}
          </Animated.View>

          {/* ─── Medical ID ─── */}
          <Animated.View entering={FadeInDown.delay(240)} style={{ marginTop: 24 }}>
            <Text style={styles.sectionTitle}>Medical ID</Text>
            <GlassCard style={{ marginTop: 12 }}>
              {[
                ['Name', 'John Doe'],
                ['Condition', 'Type 2 Diabetes'],
                ['Allergies', 'Penicillin'],
                ['Blood Type', 'O+'],
              ].map(([label, value], i, arr) => (
                <View key={label} style={[styles.idRow, i < arr.length - 1 && styles.idRowBorder]}>
                  <Text style={styles.idLabel}>{label}</Text>
                  <Text style={styles.idValue}>{value}</Text>
                </View>
              ))}
            </GlassCard>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#3A0000' },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 },
  backButton:         { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle:        { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  addButton:          { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center', ...SHADOWS.limeButtonGlow },
  content:            { padding: 24, paddingBottom: 60 },
  alertHeader:        { alignItems: 'center', marginBottom: 28, gap: 12 },
  title:              { color: '#FFF', fontSize: 22, fontWeight: 'bold', textAlign: 'center', lineHeight: 28 },
  subtitle:           { color: 'rgba(255,255,255,0.75)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  primaryCallButton:  { flexDirection: 'row', backgroundColor: COLORS.danger, paddingVertical: 16, borderRadius: RADII.button, alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 28, ...SHADOWS.limeButtonGlow },
  primaryCallText:    { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  sectionHeader:      { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle:       { color: '#FFF', fontSize: 18, fontWeight: 'bold', flex: 1 },
  sectionAddBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADII.button, backgroundColor: 'rgba(255,77,77,0.2)', borderWidth: 1, borderColor: COLORS.danger },
  sectionAddText:     { color: COLORS.danger, fontSize: 13, fontWeight: '600' },
  emptyText:          { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', marginTop: 20 },
  contactCard:        { padding: 16 },
  contactRow:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactIcon:        { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,77,77,0.12)', alignItems: 'center', justifyContent: 'center' },
  contactInfo:        { flex: 1 },
  contactName:        { color: COLORS.textOnLight, fontSize: 15, fontWeight: '700' },
  contactRelationship:{ color: COLORS.textOnLightSoft, fontSize: 12, marginTop: 2 },
  contactPhone:       { color: COLORS.textOnLightFaint, fontSize: 12, marginTop: 1 },
  contactActions:     { flexDirection: 'row', gap: 8 },
  actionBtn:          { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.bgCardAlt, borderWidth: 1, borderColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center' },
  divider:            { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 12 },
  editRow:            { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifyBadge:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADII.chip, backgroundColor: COLORS.dangerDim, borderWidth: 1, borderColor: 'rgba(255,77,77,0.25)' },
  notifyBadgeText:    { color: COLORS.danger, fontSize: 10, fontWeight: '600' },
  editBtn:            { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  idRow:              { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  idRowBorder:        { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  idLabel:            { ...TYPE.body, color: COLORS.textOnLightSoft },
  idValue:            { ...TYPE.bodyStrong },
});
