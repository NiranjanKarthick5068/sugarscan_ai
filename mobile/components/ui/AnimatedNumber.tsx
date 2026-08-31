/**
 * AnimatedNumber — counts up from 0 to `value` using spring physics.
 * Shows nothing while value is undefined/null (honest loading state).
 * Supports an optional suffix (e.g. "%" or " mg/dL").
 *
 * Use this for every metric displayed as a number, so it animates in
 * when real data arrives rather than appearing as static text.
 */
import React, { useEffect } from 'react';
import { StyleProp, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useDerivedValue,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import ReanimatedText from 'react-native-reanimated'; // for ReText

// Inline re-export since ReText is not always available
import { Text } from 'react-native';

interface AnimatedNumberProps {
  value: number | null | undefined;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  style?: StyleProp<TextStyle>;
  // Spring config
  stiffness?: number;
  damping?: number;
}

export function AnimatedNumber({
  value,
  suffix = '',
  prefix = '',
  decimals = 0,
  style,
  stiffness = 120,
  damping = 18,
}: AnimatedNumberProps) {
  const animatedValue = useSharedValue(0);
  const [display, setDisplay] = React.useState<string | null>(null);

  useEffect(() => {
    if (value === null || value === undefined) {
      setDisplay(null);
      return;
    }
    // Count up with spring to real value
    animatedValue.value = withSpring(value, {
      stiffness,
      damping,
      overshootClamping: true,
    });
  }, [value]);

  // We use a JS-driven interval to read the animated value and update display.
  // This avoids the ReText dep while still giving smooth count-up on the JS thread.
  useEffect(() => {
    if (value === null || value === undefined) return;

    let frame: ReturnType<typeof setTimeout>;
    const startTime = Date.now();
    const duration = 900;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * value;
      setDisplay(`${prefix}${current.toFixed(decimals)}${suffix}`);
      if (progress < 1) {
        frame = setTimeout(tick, 16);
      }
    };

    tick();
    return () => clearTimeout(frame);
  }, [value]);

  if (display === null) return null;

  return <Text style={style}>{display}</Text>;
}
