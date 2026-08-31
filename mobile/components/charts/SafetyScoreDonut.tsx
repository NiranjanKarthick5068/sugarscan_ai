import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface SafetyScoreDonutProps {
  safeRate: number; // 0-100
  size?: number;
}

export function SafetyScoreDonut({ safeRate, size = 120 }: SafetyScoreDonutProps) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safeRate / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background Circle */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="rgba(255,77,106,0.2)" // Danger background
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Foreground Arc */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="#AAFF00" // Safe color
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF' }}>
          {Math.round(safeRate)}%
        </Text>
        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: -2, textTransform: 'uppercase' }}>
          Safe
        </Text>
      </View>
    </View>
  );
}
