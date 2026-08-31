import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, RADII, DURATIONS } from '../../theme/tokens';

interface GhostButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  dark?: boolean;
}

export function GhostButton({
  children,
  onPress,
  size = 'md',
  style,
  textStyle,
  disabled,
  dark = false,
}: GhostButtonProps) {
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

  const sizeStyle = size === 'lg' ? styles.sizeLg : size === 'sm' ? styles.sizeSm : styles.sizeMd;
  const sizeTextStyle = size === 'lg' ? styles.textLg : size === 'sm' ? styles.textSm : styles.textMd;

  const borderColor = dark ? COLORS.borderDark : COLORS.borderLight;
  const bgColor = dark ? 'rgba(255,255,255,0.05)' : 'rgba(26,26,26,0.04)';
  const textColor = dark ? COLORS.textOnDark : COLORS.textOnLight;

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={1}
        style={[
          styles.button,
          sizeStyle,
          {
            backgroundColor: bgColor,
            borderColor,
          },
          disabled && styles.disabled,
        ]}
      >
        <Text style={[styles.text, sizeTextStyle, { color: textColor }, textStyle]}>
          {children}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.button,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
  },
  sizeSm: { paddingHorizontal: 16, paddingVertical: 10, minHeight: 38 },
  sizeMd: { paddingHorizontal: 24, paddingVertical: 14, minHeight: 48 },
  sizeLg: { paddingHorizontal: 32, paddingVertical: 18, minHeight: 56 },
  text: { fontWeight: '600' },
  textSm: { fontSize: 13 },
  textMd: { fontSize: 15 },
  textLg: { fontSize: 17 },
  disabled: { opacity: 0.45 },
});
