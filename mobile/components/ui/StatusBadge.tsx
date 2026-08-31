import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADII } from '../../theme/tokens';

type Variant = 'safe' | 'warning' | 'critical' | 'info' | 'neutral';

interface StatusBadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  dark?: boolean;
}

const VARIANT_MAP: Record<Variant, { bg: string; text: string; border: string }> = {
  safe: {
    bg: COLORS.limeDim,
    text: COLORS.greenDeep,
    border: 'rgba(164,233,3,0.30)',
  },
  warning: {
    bg: COLORS.warningDim,
    text: '#9A6600',
    border: 'rgba(245,166,35,0.30)',
  },
  critical: {
    bg: COLORS.dangerDim,
    text: '#B00020',
    border: 'rgba(255,77,77,0.30)',
  },
  info: {
    bg: COLORS.infoDim,
    text: '#1D52CC',
    border: 'rgba(78,140,255,0.30)',
  },
  neutral: {
    bg: 'rgba(26,26,26,0.06)',
    text: COLORS.textOnLightSoft,
    border: COLORS.borderLight,
  },
};

export function StatusBadge({ variant = 'neutral', children, dark }: StatusBadgeProps) {
  const colors = VARIANT_MAP[variant];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.text, { color: colors.text }]}>
        {typeof children === 'string' ? children.toUpperCase() : children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.chip,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
