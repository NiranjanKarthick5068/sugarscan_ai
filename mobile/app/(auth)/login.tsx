import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, StyleSheet, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Zap, Eye, EyeOff } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { NeonButton } from '../../components/ui/NeonButton';
import { GhostButton } from '../../components/ui/GhostButton';
import { supabaseSignIn } from '../../store/authStore';
import { useAuthStore } from '../../store/authStore';
import { COLORS, RADII, SHADOWS, TYPE } from '../../theme/tokens';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setHasCompletedOnboarding = useAuthStore(s => s.setHasCompletedOnboarding);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const { user } = await supabaseSignIn(email.trim(), password);
      // Check if onboarding is complete — look at profiles.diabetes_type via Supabase
      // For now, optimistically assume complete if user exists (onboarding state is
      // loaded from SecureStore by loadStoredAuth, which was called on app start)
      if (!user) throw new Error('Sign-in returned no user');
      // The onAuthStateChange listener in authStore will update isAuthenticated → routing handled by _layout.tsx
    } catch (error: any) {
      const msg = error?.message || 'An error occurred. Please try again.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPage} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo + branding */}
        <Animated.View entering={FadeInDown.delay(60).springify().stiffness(280).damping(26)} style={styles.brandSection}>
          <View style={styles.logoBox}>
            <Zap size={36} color={COLORS.textOnLime} strokeWidth={2} />
          </View>
          <Text style={styles.appName}>SugarScan AI</Text>
          <Text style={styles.tagline}>Intelligent Diabetes Management</Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInDown.delay(140).springify().stiffness(280).damping(26)} style={styles.form}>
          <Text style={styles.sectionTitle}>Sign In</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={COLORS.textOnLightFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.inputPasswordField]}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.textOnLightFaint}
                secureTextEntry={!showPassword}
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleLogin}
                returnKeyType="go"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                style={styles.eyeBtn}
              >
                {showPassword
                  ? <EyeOff size={18} color={COLORS.textOnLightFaint} />
                  : <Eye size={18} color={COLORS.textOnLightFaint} />
                }
              </TouchableOpacity>
            </View>
          </View>

          <NeonButton onPress={handleLogin} loading={loading} size="lg" style={{ marginTop: 8 }}>
            Sign In
          </NeonButton>

          <GhostButton
            onPress={() => router.push('/(auth)/register' as any)}
            size="lg"
            style={{ marginTop: 12 }}
          >
            Create Account
          </GhostButton>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220)} style={styles.footer}>
          <Text style={styles.footerText}>
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bgPage },
  scroll:       { flexGrow: 1, padding: 24, justifyContent: 'center', paddingBottom: 48 },
  brandSection: { alignItems: 'center', marginBottom: 44 },
  logoBox: {
    width: 72, height: 72, borderRadius: RADII.card,
    backgroundColor: COLORS.lime,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    ...SHADOWS.limeButtonGlow,
  },
  appName:      { ...TYPE.display, fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  tagline:      { ...TYPE.body, marginTop: 6, color: COLORS.textOnLightSoft },
  form: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADII.card,
    padding: 24,
    gap: 16,
    ...SHADOWS.cardOnLight,
  },
  sectionTitle: { ...TYPE.h2, marginBottom: 4 },
  fieldGroup:   { gap: 6 },
  fieldLabel:   { ...TYPE.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: COLORS.bgCardAlt,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    borderRadius: RADII.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    ...TYPE.body,
    color: COLORS.textOnLight,
  },
  passwordRow:      { position: 'relative' },
  inputPasswordField: { paddingRight: 48 },
  eyeBtn: {
    position: 'absolute', right: 14, top: 0, bottom: 0,
    justifyContent: 'center',
  },
  footer:           { marginTop: 24 },
  footerText:       { ...TYPE.caption, textAlign: 'center', color: COLORS.textOnLightFaint },
});
