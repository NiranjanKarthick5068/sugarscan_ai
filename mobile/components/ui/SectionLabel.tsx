import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { COLORS } from '../../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';

interface SectionLabelProps {
  children: string;
  icon?: React.ReactNode;
  variant?: 'neon' | 'white' | 'subtle';
  style?: StyleProp<ViewStyle>;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({
  children,
  icon,
  variant = 'neon',
  style,
}) => {
  const colorMap = {
    neon: COLORS.neon,
    white: COLORS.textPrimary,
    subtle: COLORS.textTertiary,
  };
  
  const activeColor = colorMap[variant];

  // React Native doesn't easily let us extract hex+opacity string to pass to LinearGradient array without parsing.
  // So we'll use a hack if it's # hex, else if it's rgba we replace 1 with 0.25.
  // We know neon is #AAFF00, textPrimary is #FFFFFF, textTertiary is rgba(255,255,255,0.45)
  let gradientStart = `${activeColor}40`; // fallback hex+alpha
  if (activeColor.startsWith('rgba')) {
    gradientStart = activeColor.replace(/[\d.]+\)$/, '0.25)');
  } else if (activeColor === COLORS.neon) {
    gradientStart = 'rgba(170,255,0,0.25)';
  } else if (activeColor === COLORS.textPrimary) {
    gradientStart = 'rgba(255,255,255,0.25)';
  }

  return (
    <View style={[styles.container, style]}>
      {icon && (
        <View style={styles.iconContainer}>
          {icon}
        </View>
      )}
      <Text style={[styles.text, { color: activeColor }]}>{children}</Text>
      
      <LinearGradient
        colors={[gradientStart, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.line}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    opacity: 0.7,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  line: {
    flex: 1,
    height: 1,
    marginLeft: 12,
  },
});
