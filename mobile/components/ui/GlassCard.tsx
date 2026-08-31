import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADII, SHADOWS } from '../../theme/tokens';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevation?: 1 | 2 | 3;
  glow?: boolean;
  onPress?: () => void;
  dark?: boolean;
}

// Thin wrapper so we can add press-scale later in Phase 7 without changing call sites
import { TouchableOpacity } from 'react-native';

export function GlassCard({
  children,
  style,
  elevation = 1,
  glow = false,
  onPress,
  dark = false,
}: GlassCardProps) {
  const shadowStyle =
    elevation === 3
      ? SHADOWS.cardOnLightRaised
      : elevation === 2
      ? SHADOWS.cardOnLight
      : SHADOWS.elevation1;

  const glowStyle = glow
    ? {
        borderWidth: 1.5,
        borderColor: COLORS.lime,
      }
    : {
        borderWidth: 1.5,
        borderColor: dark ? COLORS.borderDark : COLORS.borderLight,
      };

  const bgColor = dark ? COLORS.bgDark : COLORS.bgCard;

  const inner = (
    <View
      style={[
        styles.card,
        { backgroundColor: bgColor },
        shadowStyle,
        glowStyle,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {inner}
      </TouchableOpacity>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADII.card,
    padding: 16,
    overflow: 'hidden',
  },
});
