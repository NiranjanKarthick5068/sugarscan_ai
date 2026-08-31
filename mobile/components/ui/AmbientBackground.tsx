import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AmbientBackgroundProps {
  variant?: 'default' | 'danger' | 'purple' | 'blue';
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({
  variant = 'default',
}) => {
  const accentColors = {
    default: { primary: 'rgba(170,255,0,0.15)', secondary: 'rgba(85,88,227,0.15)' },
    danger:  { primary: 'rgba(255,77,106,0.15)', secondary: 'rgba(255,120,50,0.15)' },
    purple:  { primary: 'rgba(179,157,219,0.15)', secondary: 'rgba(85,88,227,0.15)' },
    blue:    { primary: 'rgba(107,138,255,0.15)', secondary: 'rgba(85,88,227,0.15)' },
  };
  
  const colors = accentColors[variant] || accentColors.default;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* Background base */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#04050F' }]} />
      
      {/* Simplified ambient gradients since we don't have Canvas particles */}
      <LinearGradient
        colors={['#0E1035', '#08092A', '#04050F']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Top Left Orb */}
      <View style={[styles.orb, { top: -100, left: -100, backgroundColor: colors.secondary }]} />
      
      {/* Bottom Right Orb */}
      <View style={[styles.orb, { bottom: -100, right: -100, backgroundColor: colors.primary }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.6,
    // Add a blur if needed or just rely on opacity
  },
});
