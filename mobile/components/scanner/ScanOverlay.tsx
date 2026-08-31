import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.75;
const CORNER_LENGTH = 40;
const CORNER_WIDTH = 4;
const NEON_GREEN = '#AAFF00';

export function ScanOverlay() {
  const lineY = useSharedValue(0);
  const cornerOpacity = useSharedValue(0.4);

  useEffect(() => {
    // Animate scanline top to bottom
    lineY.value = withRepeat(
      withSequence(
        withTiming(SCAN_AREA_SIZE, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 0 }) // snap back to top
      ),
      -1,
      false
    );

    // Pulse corners
    cornerOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.4, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lineY.value }],
  }));

  const animatedCornerStyle = useAnimatedStyle(() => ({
    opacity: cornerOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Dark overlay top */}
      <View style={[styles.overlay, { height: (height - SCAN_AREA_SIZE) / 2 }]} />
      
      <View style={styles.middleRow}>
        {/* Dark overlay left */}
        <View style={[styles.overlay, { width: (width - SCAN_AREA_SIZE) / 2 }]} />
        
        {/* Clear Scan Area */}
        <View style={{ width: SCAN_AREA_SIZE, height: SCAN_AREA_SIZE }}>
          
          {/* Animated Scanline */}
          <Animated.View style={[styles.scanline, animatedLineStyle]} />
          
          {/* Top Left Corner */}
          <Animated.View style={[styles.corner, styles.topLeft, animatedCornerStyle]} />
          
          {/* Top Right Corner */}
          <Animated.View style={[styles.corner, styles.topRight, animatedCornerStyle]} />
          
          {/* Bottom Left Corner */}
          <Animated.View style={[styles.corner, styles.bottomLeft, animatedCornerStyle]} />
          
          {/* Bottom Right Corner */}
          <Animated.View style={[styles.corner, styles.bottomRight, animatedCornerStyle]} />
          
        </View>
        
        {/* Dark overlay right */}
        <View style={[styles.overlay, { width: (width - SCAN_AREA_SIZE) / 2 }]} />
      </View>
      
      {/* Dark overlay bottom */}
      <View style={[styles.overlay, { height: (height - SCAN_AREA_SIZE) / 2 }]}>
        <Text style={styles.instruction}>Point camera at food to analyze</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  overlay: {
    backgroundColor: 'rgba(4,5,15,0.7)',
  },
  middleRow: {
    flexDirection: 'row',
  },
  scanline: {
    width: '100%',
    height: 2,
    backgroundColor: NEON_GREEN,
    shadowColor: NEON_GREEN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
    position: 'absolute',
    top: 0,
    zIndex: 2,
  },
  corner: {
    position: 'absolute',
    borderColor: NEON_GREEN,
    shadowColor: NEON_GREEN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    width: CORNER_LENGTH,
    height: CORNER_LENGTH,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    width: CORNER_LENGTH,
    height: CORNER_LENGTH,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    width: CORNER_LENGTH,
    height: CORNER_LENGTH,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    width: CORNER_LENGTH,
    height: CORNER_LENGTH,
    borderBottomRightRadius: 16,
  },
  instruction: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.8,
  },
});
