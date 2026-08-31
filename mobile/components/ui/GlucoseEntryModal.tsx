import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { NeonButton } from './NeonButton';
import { GhostButton } from './GhostButton';
import { glucoseAPI } from '../../services/api';
import { useQueryClient } from '@tanstack/react-query';
import { COLORS, TYPE, RADII, SPACING } from '../../theme/tokens';
import { BlurView } from 'expo-blur';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function GlucoseEntryModal({ visible, onClose }: Props) {
  const [glucose, setGlucose] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState('random');
  const queryClient = useQueryClient();

  const CONTEXT_OPTIONS = [
    { id: 'random', label: 'Random' },
    { id: 'fasting', label: 'Fasting' },
    { id: 'before_meal', label: 'Pre-meal' },
    { id: 'after_meal', label: 'Post-meal' },
    { id: 'bedtime', label: 'Bedtime' },
  ];

  const handleSave = async () => {
    const val = parseFloat(glucose);
    if (isNaN(val) || val < 20 || val > 600) {
      Alert.alert('Invalid Entry', 'Please enter a valid glucose value (20 - 600 mg/dL).');
      return;
    }

    setLoading(true);
    try {
      const response: any = await glucoseAPI.log({
        glucose_value_mg_dl: val,
        measurement_type: context,
        notes: notes.trim() || undefined,
      });
      // Invalidate queries to refresh dashboard/history
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['glucose'] });
      setGlucose('');
      setNotes('');
      onClose();
      
      if (response.safety_alert) {
        setTimeout(() => {
          Alert.alert('Safety Alert', response.safety_alert);
        }, 500);
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to log glucose.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView intensity={20} tint="dark" style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ 
          backgroundColor: COLORS.bgCard, 
          borderTopLeftRadius: RADII.sheetTop, 
          borderTopRightRadius: RADII.sheetTop, 
          padding: SPACING.xl,
          paddingBottom: 40,
        }}>
          
          <Text style={{ ...TYPE.h2, marginBottom: SPACING.xl }}>
            Log Glucose Reading
          </Text>

          <View style={{ gap: SPACING.base, marginBottom: SPACING.xxl }}>
            <View>
              <Text style={{ ...TYPE.caption, marginBottom: SPACING.xs, marginLeft: SPACING.xs }}>Glucose (mg/dL)</Text>
              <TextInput
                style={{
                  backgroundColor: COLORS.bgCardAlt,
                  borderWidth: 1,
                  borderColor: COLORS.borderLight,
                  borderRadius: RADII.md,
                  padding: SPACING.base,
                  color: COLORS.limePressed,
                  fontSize: 24,
                  fontWeight: '700',
                  textAlign: 'center'
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.textOnLightFaint}
                value={glucose}
                onChangeText={setGlucose}
                autoFocus
              />
            </View>

            <View>
              <Text style={{ ...TYPE.caption, marginBottom: SPACING.xs, marginLeft: SPACING.xs }}>Context</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
                {CONTEXT_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setContext(opt.id)}
                    style={{
                      paddingVertical: SPACING.sm,
                      paddingHorizontal: SPACING.md,
                      borderRadius: RADII.chip,
                      backgroundColor: context === opt.id ? COLORS.lime : COLORS.bgCardAlt,
                      borderWidth: 1,
                      borderColor: context === opt.id ? COLORS.limePressed : COLORS.borderLight,
                    }}
                  >
                    <Text style={{ 
                      ...TYPE.button, 
                      fontSize: 13,
                      color: context === opt.id ? COLORS.textOnLime : COLORS.textOnLight 
                    }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text style={{ ...TYPE.caption, marginBottom: SPACING.xs, marginLeft: SPACING.xs }}>Notes (Optional)</Text>
              <TextInput
                style={{
                  backgroundColor: COLORS.bgCardAlt,
                  borderWidth: 1,
                  borderColor: COLORS.borderLight,
                  borderRadius: RADII.md,
                  padding: SPACING.base,
                  ...TYPE.body,
                }}
                placeholder="e.g. 2 hours after lunch"
                placeholderTextColor={COLORS.textOnLightFaint}
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: SPACING.base }}>
            <GhostButton onPress={onClose} style={{ flex: 1 }}>Cancel</GhostButton>
            <NeonButton onPress={handleSave} loading={loading} style={{ flex: 1 }}>Save</NeonButton>
          </View>

        </View>
      </BlurView>
    </Modal>
  );
}
