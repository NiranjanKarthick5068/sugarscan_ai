import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADII, SHADOWS } from '../../theme/tokens';

interface MetricChipProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  color?: string;
  style?: ViewStyle;
  dark?: boolean;
}

export function MetricChip({ label, value, icon, color, style, dark = false }: MetricChipProps) {
  const accentColor = color ?? COLORS.lime;
  const bg = dark ? COLORS.bgDarkElevated : COLORS.bgCard;
  const labelColor = dark ? COLORS.textOnDarkFaint : COLORS.textOnLightFaint;
  const valueColor = dark ? COLORS.textOnDark : COLORS.textOnLight;

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: bg },
        SHADOWS.elevation1,
        style,
      ]}
    >
      {icon && (
        <View style={[styles.iconWrapper, { backgroundColor: accentColor + '18' }]}>
          {icon}
        </View>
      )}
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    padding: 12,
    borderRadius: RADII.card,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },
});
