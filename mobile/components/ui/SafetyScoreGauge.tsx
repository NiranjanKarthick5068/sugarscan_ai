import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing, useDerivedValue } from 'react-native-reanimated';

interface SafetyScoreGaugeProps {
  score: number;
  size?: number;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function SafetyScoreGauge({ score, size = 160 }: SafetyScoreGaugeProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Arc angles
  const startAngle = 225;
  const endAngle = -45;
  const sweepAngle = startAngle - endAngle; // 270 degrees

  // Colors
  const getColor = (s: number) => {
    if (s <= 40) return '#FF4D6A';
    if (s <= 60) return '#FFB800';
    if (s <= 80) return '#FFD700';
    return '#AAFF00';
  };
  const color = getColor(score);

  // Animation
  const animatedScore = useSharedValue(0);
  
  useEffect(() => {
    animatedScore.value = withTiming(score, {
      duration: 1500,
      easing: Easing.out(Easing.cubic),
    });
  }, [score]);

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  };

  const backgroundPath = describeArc(cx, cy, radius, endAngle, startAngle);
  const arcLength = 2 * Math.PI * radius * (sweepAngle / 360);

  const animatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: arcLength * (1 - (animatedScore.value / 100)),
    };
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Background Track */}
        <Path
          d={backgroundPath}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {/* Animated Fill */}
        <AnimatedPath
          d={backgroundPath}
          animatedProps={animatedProps}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={arcLength}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 36, fontWeight: '800', color: '#FFFFFF' }}>
          {score}
        </Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: -4 }}>
          Safety Score
        </Text>
      </View>
    </View>
  );
}
