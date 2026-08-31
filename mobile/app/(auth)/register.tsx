import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, StyleSheet, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { NeonButton } from '../../components/ui/NeonButton';
import { supabaseSignUp } from '../../store/authStore';
import { COLORS, RADII, SHADOWS, TYPE } from '../../theme/tokens';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!email.trim() || !password || !fullName.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const { user, session } = await supabaseSignUp(email.trim(), password, fullName.trim());
      if (!user) throw new Error('No user returned from sign-up');

      // If session is null, Supabase sent a confirmation email
      if (!session) {
        Alert.alert(
          'Confirm your email',
          'We sent a confirmation email. Please check your inbox and click the link to activate your account, then sign in.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
        );
        return;
      }
      // onAuthStateChange in authStore will pick up the session → _layout.tsx redirects
    } catch (error: any) {
      const msg = error?.message || 'Registration failed. Please try again.';
      Alert.alert('Sign Up Failed', msg);
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

        <Animated.View entering={FadeInDown.delay(60).springify().stiffness(280).damping(26)} style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={COLORS.textOnLight} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify().stiffness(280).damping(26)} style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join SugarScan AI — free forever.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).springify().stiffness(280).damping(26)} style={styles.form}>
          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={COLORS.textOnLightFaint}
              autoComplete="name"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {/* Email */}
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

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.inputPasswordField]}
                placeholder="Min. 8 characters"
                placeholderTextColor={COLORS.textOnLightFaint}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleRegister}
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

          <NeonButton onPress={handleRegister} loading={loading} size="lg" style={{ marginTop: 8 }}>
            Create Account
          </NeonButton>

          <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'center', marginTop: 12 }}>
            <Text style={styles.signInLink}>Already have an account? <Text style={styles.signInLinkBold}>Sign In</Text></Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220)} style={styles.footer}>
          <Text style={styles.footerText}>
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.bgPage },
  scroll:        { flexGrow: 1, padding: 24, paddingBottom: 48 },
  topRow:        { marginTop: 12, marginBottom: 24 },
  backBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center', ...SHADOWS.elevation1 },
  header:        { marginBottom: 28 },
  title:         { ...TYPE.display, fontWeight: '900', letterSpacing: -0.5 },
  subtitle:      { ...TYPE.body, marginTop: 6, color: COLORS.textOnLightSoft },
  form:          { backgroundColor: COLORS.bgCard, borderRadius: RADII.card, padding: 24, gap: 16, ...SHADOWS.cardOnLight },
  fieldGroup:    { gap: 6 },
  fieldLabel:    { ...TYPE.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:         {
    backgroundColor: COLORS.bgCardAlt,
    borderWidth: 1.5, borderColor: COLORS.borderLight,
    borderRadius: RADII.md,
    paddingHorizontal: 14, paddingVertical: 13,
    ...TYPE.body, color: COLORS.textOnLight,
  },
  passwordRow:        { position: 'relative' },
  inputPasswordField: { paddingRight: 48 },
  eyeBtn:             { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  signInLink:         { ...TYPE.caption, color: COLORS.textOnLightSoft },
  signInLinkBold:     { color: COLORS.greenDeep, fontWeight: '700' },
  footer:             { marginTop: 24 },
  footerText:         { ...TYPE.caption, textAlign: 'center', color: COLORS.textOnLightFaint },
});
