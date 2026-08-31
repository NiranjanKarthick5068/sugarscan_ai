import React from 'react';
import { StyleSheet, Text, TouchableWithoutFeedback, ViewStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { COLORS, SHADOWS } from '../../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface DateChipProps {
  day: string;
  date: number | string;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const DateChip: React.FC<DateChipProps> = ({
  day,
  date,
  active = false,
  onPress,
  style,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { stiffness: 400, damping: 20 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { stiffness: 400, damping: 20 });
  };

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View style={[
        styles.container,
        active ? styles.containerActive : styles.containerInactive,
        active ? SHADOWS.neonGlow : SHADOWS.elevation1,
        animatedStyle,
        style
      ]}>
        {active ? (
          <LinearGradient
            colors={[COLORS.lime, '#8FCB02']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        ) : (
          <LinearGradient
            colors={[COLORS.bgCardAlt, COLORS.bgCardAlt]}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        
        <Text style={[styles.day, { color: active ? COLORS.textOnLime : COLORS.textOnLightSoft }]}>
          {day}
        </Text>
        <Text style={[styles.date, { color: active ? COLORS.textOnLime : COLORS.textOnLight }]}>
          {date}
        </Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 52,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  containerActive: {
    borderColor: 'rgba(164,233,3,0.3)',
  },
  containerInactive: {
    borderColor: COLORS.borderLight,
  },
  day: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  date: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
