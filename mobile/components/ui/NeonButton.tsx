import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, RADII, SHADOWS, DURATIONS } from '../../theme/tokens';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface NeonButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  pulse?: boolean;
  dark?: boolean;
}

export function NeonButton({
  children,
  onPress,
  size = 'md',
  style,
  textStyle,
  disabled,
  loading,
  dark = false,
}: NeonButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { duration: DURATIONS.fast });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { duration: DURATIONS.fast });
  };

  const sizeStyle = size === 'lg'
    ? styles.sizeLg
    : size === 'sm'
    ? styles.sizeSm
    : styles.sizeMd;

  const sizeTextStyle = size === 'lg'
    ? styles.textLg
    : size === 'sm'
    ? styles.textSm
    : styles.textMd;

  const bgColor = dark ? COLORS.bgDark : COLORS.lime;
  const textColor = dark ? COLORS.textOnDark : COLORS.textOnLime;

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
        style={[
          styles.button,
          sizeStyle,
          { backgroundColor: bgColor },
          SHADOWS.limeButtonGlow,
          (disabled || loading) && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <Text style={[styles.text, sizeTextStyle, { color: textColor }, textStyle]}>
            {children}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.button,
    flexDirection: 'row',
    gap: 8,
  },
  sizeSm: { paddingHorizontal: 16, paddingVertical: 10, minHeight: 38 },
  sizeMd: { paddingHorizontal: 24, paddingVertical: 14, minHeight: 48 },
  sizeLg: { paddingHorizontal: 32, paddingVertical: 18, minHeight: 56 },
  text: { fontWeight: '700' },
  textSm: { fontSize: 13, lineHeight: 18 },
  textMd: { fontSize: 15, lineHeight: 20 },
  textLg: { fontSize: 17, lineHeight: 22 },
  disabled: { opacity: 0.45 },
});
