import React, { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { NeonButton } from '../components/ui/NeonButton';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { COLORS, RADII, TYPE, SHADOWS } from '../theme/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardingScreen() {
  const [diabetesType, setDiabetesType] = useState('type2');
  const [targetMin, setTargetMin] = useState('70');
  const [targetMax, setTargetMax] = useState('140');
  const [restrictions, setRestrictions] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setHasCompletedOnboarding = useAuthStore((s) => s.setHasCompletedOnboarding);

  const DIABETES_TYPES = [
    { label: 'Type 1', value: 'type1' },
    { label: 'Type 2', value: 'type2' },
    { label: 'Gestational', value: 'gestational' },
    { label: 'Prediabetes', value: 'prediabetes' },
    { label: 'None', value: 'none' },
  ];

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Error', 'Not logged in. Please restart the app.');
      return;
    }

    const min = parseFloat(targetMin);
    const max = parseFloat(targetMax);
    if (isNaN(min) || isNaN(max) || min >= max) {
      Alert.alert('Error', 'Please enter a valid target glucose range.');
      return;
    }

    setLoading(true);
    try {
      const dietary_restrictions = restrictions.split(',').map(s => s.trim()).filter(Boolean);
      
      // 1. Update the user's profile with diabetes type and glucose targets
      const { error: profileError } = await supabase.from('profiles').update({
        diabetes_type: diabetesType,
        target_glucose_min: min,
        target_glucose_max: max,
      }).eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Upsert health profile data (mapping dietary restrictions to allergies for now)
      if (dietary_restrictions.length > 0) {
        const { error: healthError } = await supabase.from('health_profiles').upsert({
          user_id: user.id,
          allergies: dietary_restrictions,
        }, { onConflict: 'user_id' });
        if (healthError) throw healthError;
      }
      
      setHasCompletedOnboarding?.(true);
      router.replace('/(app)/(tabs)/dashboard');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save health profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: COLORS.bgPage }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 40 }}>
          
          <View style={{ marginBottom: 40 }}>
            <Text style={{ ...TYPE.h1, color: COLORS.textOnLight, marginBottom: 8 }}>
              Health Profile
            </Text>
            <Text style={{ ...TYPE.body, color: COLORS.textOnLightSoft }}>
              Let's personalize your SugarScan AI experience.
            </Text>
          </View>

          <View style={{ gap: 24, marginBottom: 32 }}>
            <View>
              <Text style={{ ...TYPE.bodyStrong, color: COLORS.textOnLight, marginBottom: 12, marginLeft: 4 }}>
                Diabetes Type
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {DIABETES_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.value}
                    onPress={() => setDiabetesType(type.value)}
                    style={{
                      backgroundColor: diabetesType === type.value ? COLORS.lime : COLORS.bgCardAlt,
                      borderWidth: 1,
                      borderColor: diabetesType === type.value ? COLORS.lime : COLORS.borderLight,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: RADII.button,
                      ...SHADOWS.cardOnLight,
                    }}
                  >
                    <Text style={{ 
                      ...TYPE.bodyStrong, 
                      color: diabetesType === type.value ? COLORS.textOnLime : COLORS.textOnLightSoft 
                    }}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...TYPE.caption, textTransform: 'uppercase', color: COLORS.textOnLightSoft, marginBottom: 8, marginLeft: 4 }}>
                  Target Min (mg/dL)
                </Text>
                <TextInput
                  style={{
                    backgroundColor: COLORS.bgCardAlt,
                    borderWidth: 1,
                    borderColor: COLORS.borderLight,
                    borderRadius: RADII.md,
                    padding: 16,
                    color: COLORS.textOnLight,
                    fontSize: 16,
                  }}
                  keyboardType="numeric"
                  value={targetMin}
                  onChangeText={setTargetMin}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...TYPE.caption, textTransform: 'uppercase', color: COLORS.textOnLightSoft, marginBottom: 8, marginLeft: 4 }}>
                  Target Max (mg/dL)
                </Text>
                <TextInput
                  style={{
                    backgroundColor: COLORS.bgCardAlt,
                    borderWidth: 1,
                    borderColor: COLORS.borderLight,
                    borderRadius: RADII.md,
                    padding: 16,
                    color: COLORS.textOnLight,
                    fontSize: 16,
                  }}
                  keyboardType="numeric"
                  value={targetMax}
                  onChangeText={setTargetMax}
                />
              </View>
            </View>

            <View>
              <Text style={{ ...TYPE.caption, textTransform: 'uppercase', color: COLORS.textOnLightSoft, marginBottom: 8, marginLeft: 4 }}>
                Dietary Restrictions
              </Text>
              <TextInput
                style={{
                  backgroundColor: COLORS.bgCardAlt,
                  borderWidth: 1,
                  borderColor: COLORS.borderLight,
                  borderRadius: RADII.md,
                  padding: 16,
                  color: COLORS.textOnLight,
                  fontSize: 16,
                }}
                placeholder="e.g. Vegetarian, Gluten-Free"
                placeholderTextColor={COLORS.textOnLightFaint}
                value={restrictions}
                onChangeText={setRestrictions}
              />
            </View>
          </View>

          <NeonButton 
            onPress={handleSave} 
            loading={loading}
            size="lg"
            style={{ marginTop: 'auto', marginBottom: 24 }}
          >
            Complete Setup
          </NeonButton>
          
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
