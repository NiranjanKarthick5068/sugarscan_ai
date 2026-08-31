import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, DimensionValue } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing, interpolate } from 'react-native-reanimated';
import { COLORS } from '../../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';

interface LoadingSkeletonProps {
  variant?: 'text' | 'card' | 'circle' | 'chart' | 'metric';
  width?: DimensionValue;
  height?: DimensionValue;
  lines?: number;
  style?: StyleProp<ViewStyle>;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'text',
  width,
  height,
  lines = 1,
  style,
}) => {
  const shimmerProgress = useSharedValue(0);

  useEffect(() => {
    shimmerProgress.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: interpolate(shimmerProgress.value, [0, 1], [-500, 500]) }],
    };
  });

  const ShimmerBase = ({ w, h, br }: { w: DimensionValue; h: DimensionValue; br: number }) => (
    <View style={[{ width: w, height: h, borderRadius: br, backgroundColor: COLORS.skeleton, overflow: 'hidden' }, style]}>
      <Animated.View style={[StyleSheet.absoluteFillObject, animatedStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );

  if (variant === 'card') {
    return <ShimmerBase w={width || '100%'} h={height || 120} br={20} />;
  }

  if (variant === 'circle') {
    return <ShimmerBase w={width || 48} h={height || 48} br={9999} />;
  }

  if (variant === 'chart') {
    return <ShimmerBase w={width || '100%'} h={height || 200} br={20} />;
  }

  if (variant === 'metric') {
    return (
      <View style={style}>
        <ShimmerBase w="60%" h={12} br={4} />
        <View style={{ height: 8 }} />
        <ShimmerBase w="40%" h={28} br={6} />
      </View>
    );
  }

  // text variant
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, i) => (
        <View key={i} style={{ marginBottom: i === lines - 1 ? 0 : 8 }}>
          <ShimmerBase
            w={width || (i === lines - 1 && lines > 1 ? '70%' : '100%')}
            h={height || 14}
            br={4}
          />
        </View>
      ))}
    </View>
  );
};
