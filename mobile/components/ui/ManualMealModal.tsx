import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { NeonButton } from './NeonButton';
import { GhostButton } from './GhostButton';
import { scanAPI } from '../../services/api';
import { useScanStore } from '../../store/scanStore';
import { COLORS, TYPE, RADII, SPACING } from '../../theme/tokens';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Utensils } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ManualMealModal({ visible, onClose }: Props) {
  const [mealText, setMealText] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const store = useScanStore();

  const handleAnalyze = async () => {
    if (!mealText.trim()) {
      Alert.alert('Empty Input', 'Please describe the meal you ate.');
      return;
    }

    setLoading(true);
    try {
      store.setPhase('analyzing');
      store.setAnalyzingStep(1);
      store.setCapturedImageUri(null); // Clear image if any
      
      const response = await scanAPI.logManual(mealText.trim());
      
      store.setScanResult(response);
      store.setPhase('results');
      
      setMealText('');
      onClose();
      router.push('/(app)/scan-result');
      
    } catch (e: any) {
      store.setPhase('error');
      store.setError(e.response?.data?.detail || 'Failed to analyze meal.');
      Alert.alert('Analysis Failed', e.response?.data?.detail || 'Failed to analyze meal.');
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
            Manual Meal Log
          </Text>

          <View style={{ gap: SPACING.base, marginBottom: SPACING.xxl }}>
            <View>
              <Text style={{ ...TYPE.caption, marginBottom: SPACING.xs, marginLeft: SPACING.xs }}>What did you eat?</Text>
              <TextInput
                style={{
                  backgroundColor: COLORS.bgCardAlt,
                  borderWidth: 1,
                  borderColor: COLORS.borderLight,
                  borderRadius: RADII.md,
                  padding: SPACING.base,
                  color: COLORS.textOnLight,
                  ...TYPE.body,
                  minHeight: 100,
                  textAlignVertical: 'top'
                }}
                multiline
                placeholder="e.g. A bowl of oatmeal with blueberries and a black coffee"
                placeholderTextColor={COLORS.textOnLightFaint}
                value={mealText}
                onChangeText={setMealText}
                autoFocus
              />
            </View>
          </View>

          {loading ? (
             <Animated.View entering={FadeIn} exiting={FadeOut} style={{ alignItems: 'center', marginBottom: SPACING.xl }}>
               <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.limeDim, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                 <Utensils color={COLORS.greenDeep} />
               </View>
               <Text style={{ ...TYPE.bodyStrong, color: COLORS.lime }}>AI is analyzing your meal...</Text>
               <Text style={{ ...TYPE.caption, marginTop: 4 }}>Estimating glucose spike and macros</Text>
             </Animated.View>
          ) : (
            <View style={{ flexDirection: 'row', gap: SPACING.base }}>
              <GhostButton onPress={onClose} style={{ flex: 1 }}>Cancel</GhostButton>
              <NeonButton onPress={handleAnalyze} loading={loading} style={{ flex: 2 }}>Analyze Meal</NeonButton>
            </View>
          )}

        </View>
      </BlurView>
    </Modal>
  );
}
