import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Alert, ScrollView } from 'react-native';
import { NeonButton } from './NeonButton';
import { GhostButton } from './GhostButton';
import { scanAPI } from '../../services/api';
import { ScanResult } from '../../types';
import { useScanStore } from '../../store/scanStore';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  visible: boolean;
  scan: ScanResult;
  onClose: () => void;
}

export function ScanCorrectionModal({ visible, scan, onClose }: Props) {
  const [foodName, setFoodName] = useState(scan.food_name || '');
  const [weight, setWeight] = useState(scan.estimated_weight_g?.toString() || '');
  const [loading, setLoading] = useState(false);
  const { setScanResult } = useScanStore();
  const queryClient = useQueryClient();

  const handleSave = async () => {
    setLoading(true);
    try {
      const data: any = {};
      if (foodName.trim() !== scan.food_name) {
        data.food_name = foodName.trim();
      }
      const weightNum = parseFloat(weight);
      if (!isNaN(weightNum) && weightNum !== scan.estimated_weight_g) {
        data.estimated_weight_g = weightNum;
      }
      
      if (Object.keys(data).length > 0) {
        const updatedScan = await scanAPI.correct(scan.id, data);
        setScanResult(updatedScan);
        await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to update scan.');
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
          borderColor: 'rgba(255,255,255,0.1)',
          maxHeight: '80%'
        }}>
          
          <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '700', marginBottom: 24 }}>
            Correct Scan Result
          </Text>

          <ScrollView style={{ marginBottom: 32 }}>
            <View style={{ gap: 16 }}>
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 8, marginLeft: 4 }}>Food Name</Text>
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
                  value={foodName}
                  onChangeText={setFoodName}
                />
              </View>

              <View>
                <Text style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 8, marginLeft: 4 }}>Estimated Weight (g)</Text>
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
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>
            </View>
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 16 }}>
            <GhostButton onPress={onClose} style={{ flex: 1 }}>Cancel</GhostButton>
            <NeonButton onPress={handleSave} loading={loading} style={{ flex: 1 }}>Save Changes</NeonButton>
          </View>

        </View>
      </View>
    </Modal>
  );
}
