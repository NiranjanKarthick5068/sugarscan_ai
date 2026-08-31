import React from 'react';
import { View, Text, Platform } from 'react-native';
import { CartesianChart, Line, Area, useChartPressState } from 'victory-native';
import { LinearGradient, vec } from '@shopify/react-native-skia';
import { GlucoseReading } from '../../types';

interface GlucoseLineChartProps {
  readings: GlucoseReading[];
  targetMin: number;
  targetMax: number;
  height?: number;
}

export function GlucoseLineChart({ readings, targetMin, targetMax, height = 220 }: GlucoseLineChartProps) {
  if (Platform.OS === 'web') {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16 }}>
        <Text style={{ color: 'rgba(255,255,255,0.5)' }}>Interactive Chart Available on Mobile</Text>
      </View>
    );
  }

  // Need at least 2 points to draw a line. If we don't have enough, show empty state.
  if (!readings || readings.length < 2) {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.45)' }}>Not enough data to display chart</Text>
      </View>
    );
  }

  // Format data for Victory
  const data = readings.map((r) => ({
    x: new Date(r.measured_at).getTime(), // Use timestamp for X axis
    y: r.glucose_value_mg_dl,
  }));

  const { state, isActive } = useChartPressState({ x: 0, y: { y: 0 } });

  return (
    <View style={{ height, width: '100%' }}>
      <CartesianChart
        data={data}
        xKey="x"
        yKeys={["y"]}
        padding={{ top: 20, bottom: 10, left: 10, right: 10 }}
        domainPadding={{ top: 20, bottom: 20 }}
        axisOptions={{
          font: undefined, // You can pass a Skia font here
          tickCount: 5,
          labelColor: 'rgba(255,255,255,0.45)',
          lineColor: 'rgba(255,255,255,0.1)',
          formatXLabel: (val) => {
            const d = new Date(val);
            return `${d.getHours()}:00`;
          },
        }}
        chartPressState={state}
      >
        {({ points, chartBounds }) => (
          <>
            {/* Target Range Band (Min to Max) */}
            <Area
              points={points.y.map(p => ({ ...p, y: chartBounds.bottom - (targetMin / (Math.max(...data.map(d=>d.y)) || 200)) * (chartBounds.bottom - chartBounds.top) }))} // Simplified logic for target band
              y0={chartBounds.bottom - (targetMax / (Math.max(...data.map(d=>d.y)) || 200)) * (chartBounds.bottom - chartBounds.top)}
              color="rgba(107, 138, 255, 0.15)"
              animate={{ type: "timing", duration: 500 }}
            />
            
            {/* The Main Line */}
            <Line
              points={points.y}
              color="#AAFF00"
              strokeWidth={3}
              animate={{ type: "timing", duration: 500 }}
            />
            
            {/* Gradient under the line */}
            <Area
              points={points.y}
              y0={chartBounds.bottom}
              animate={{ type: "timing", duration: 500 }}
            >
              <LinearGradient
                start={vec(0, 0)}
                end={vec(0, chartBounds.bottom)}
                colors={["rgba(170, 255, 0, 0.3)", "rgba(170, 255, 0, 0)"]}
              />
            </Area>
            
            {/* Tooltip implementation is more complex with Skia, omitted for brevity but state is available */}
          </>
        )}
      </CartesianChart>
    </View>
  );
}
