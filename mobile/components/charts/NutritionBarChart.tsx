import React from 'react';
import { View, Text, Platform } from 'react-native';
import { CartesianChart, Bar } from 'victory-native';
import { LinearGradient, vec } from '@shopify/react-native-skia';
import Svg, { Rect, Line as SvgLine, Text as SvgText } from 'react-native-svg';

interface NutritionData {
  day: string;
  calories: number;
  carbs: number;
}

interface NutritionBarChartProps {
  data: NutritionData[];
  height?: number;
}

export function NutritionBarChart({ data, height = 220 }: NutritionBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.45)' }}>No nutrition data available</Text>
      </View>
    );
  }

  // Web fallback using highly responsive Flexbox + Expo LinearGradient
  if (Platform.OS === 'web') {
    const { LinearGradient: ExpoLinearGradient } = require('expo-linear-gradient');
    const maxVal = Math.max(...data.map(d => d.carbs), 50) * 1.2;
    
    return (
      <View style={{ height, width: '100%', position: 'relative' }}>
        {/* Y-Axis Grid Lines */}
        <View style={{ position: 'absolute', top: 20, left: 0, right: 0, bottom: 24, justifyContent: 'space-between', pointerEvents: 'none' }}>
          {[0, 1, 2, 3].map((i) => (
             <View key={`grid-${i}`} style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.06)', width: '100%' }} />
          ))}
        </View>

        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingHorizontal: 10, paddingBottom: 10, paddingTop: 20 }}>
          {data.map((d, i) => {
            const barHeightPct = Math.max((d.carbs / maxVal) * 100, 2); // Minimum 2% height so empty bars are visible
            
            return (
              <View key={i} style={{ alignItems: 'center', height: '100%', justifyContent: 'flex-end', width: 40 }}>
                {/* Data Label */}
                <Text style={{ color: 'rgba(0,0,0,0.7)', fontSize: 10, fontWeight: '700', marginBottom: 6, userSelect: 'none' } as any}>
                  {d.carbs > 0 ? Math.round(d.carbs) : ''}
                </Text>
                
                <ExpoLinearGradient
                  colors={['#FF3366', '#FF9933']}
                  style={{
                    width: 24,
                    height: `${barHeightPct}%`,
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6,
                  }}
                />
                
                {/* X-Axis Label */}
                <Text style={{ color: 'rgba(0,0,0,0.5)', fontSize: 11, fontWeight: '600', marginTop: 8, userSelect: 'none' } as any}>
                  {d.day}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // Native chart using victory-native and Skia
  return (
    <View style={{ height, width: '100%' }}>
      <CartesianChart
        data={data}
        xKey="day"
        yKeys={["carbs"]}
        padding={{ top: 20, bottom: 10, left: 10, right: 10 }}
        domainPadding={{ left: 20, right: 20, top: 20 }}
        axisOptions={{
          font: undefined,
          tickCount: data.length,
          labelColor: 'rgba(255,255,255,0.45)',
          lineColor: 'rgba(255,255,255,0.1)',
        }}
      >
        {({ points, chartBounds }) => (
          <Bar
            points={points.carbs}
            chartBounds={chartBounds}
            color="#FF3366"
            roundedCorners={{ topLeft: 4, topRight: 4 }}
            animate={{ type: "timing", duration: 500 }}
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, chartBounds.bottom)}
              colors={["#FF3366", "#FF9933"]}
            />
          </Bar>
        )}
      </CartesianChart>
    </View>
  );
}
