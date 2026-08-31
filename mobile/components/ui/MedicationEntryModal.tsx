import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Alert, ScrollView } from 'react-native';
import { NeonButton } from './NeonButton';
import { GhostButton } from './GhostButton';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function MedicationEntryModal({ visible, onClose }: Props) {
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [medType, setMedType] = useState('other');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (!medName.trim() || !dosage.trim()) {
      Alert.alert('Missing Info', 'Please enter a medication name and dosage.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/medications/', {
        medication_name: medName.trim(),
        dosage: dosage.trim(),
        medication_type: medType,
      });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setMedName('');
      setDosage('');
      setMedType('other');
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to log medication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(4,5,15,0.8)' }}>
        <View style={{ 
          backgroundColor: '#0A0C1B', 
          borderTopLeftRadius: 24, 
          borderTopRightRadius: 24, 
          padding: 24,
          borderTopWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)'
        }}>
          
          <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '700', marginBottom: 24 }}>
            Log Medication
          </Text>

          <View style={{ gap: 16, marginBottom: 32 }}>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 8, marginLeft: 4 }}>Medication Name</Text>
              <TextInput
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  padding: 16,
                  color: '#FFF',
                  fontSize: 16,
                }}
                placeholder="e.g. Metformin"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={medName}
                onChangeText={setMedName}
              />
            </View>

            <View>
              <Text style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 8, marginLeft: 4 }}>Dosage</Text>
              <TextInput
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  padding: 16,
                  color: '#FFF',
                  fontSize: 16,
                }}
                placeholder="e.g. 500mg or 10 units"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={dosage}
                onChangeText={setDosage}
              />
            </View>
            
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 8, marginLeft: 4 }}>Type</Text>
              <TextInput
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  padding: 16,
                  color: '#FFF',
                  fontSize: 16,
                }}
                placeholder="e.g. fast-acting insulin, oral"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={medType}
                onChangeText={setMedType}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 16 }}>
            <GhostButton onPress={onClose} style={{ flex: 1 }}>Cancel</GhostButton>
            <NeonButton onPress={handleSave} loading={loading} style={{ flex: 1 }}>Save</NeonButton>
          </View>

        </View>
      </View>
    </Modal>
  );
}
