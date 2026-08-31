import React, { useEffect } from 'react';
import { View, ViewStyle, Platform } from 'react-native';
import {
  Canvas,
  Circle,
  BlurMask,
  Group,
  Paint,
  SweepGradient,
  RadialGradient,
  vec,
  Rect,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  useDerivedValue,
} from 'react-native-reanimated';

interface Props {
  state: 'idle' | 'listening' | 'thinking' | 'data';
  moodColor: string;
  size?: number;
  style?: ViewStyle;
}

/**
 * AITwinOrb — Alexa-grade state-legible animation.
 *
 * State signals (readable without text):
 *   idle     → slow, deep breathing pulse. Ring rotates slowly. Low glow.
 *   listening → fast, sharp breath-in pulses, ring spins faster, glow brightens.
 *   thinking  → rapid micro-oscillation like a processing signal, ring spirals inward, heavy blur haze.
 *   data      → single confident expand+contract, ring fully bright, glow peak.
 *
 * Architecture:
 *   - Layer 0: RadialGradient background haze (ambient glow behind orb)
 *   - Layer 1: SweepGradient rotating ring (angular gradient on a circle stroke shell)
 *   - Layer 2: Core orb circle with RadialGradient fill and BlurMask
 *   - All driven by Reanimated shared values → Skia animated props
 */
export function AITwinOrb({ state, moodColor, size = 200, style }: Props) {
  if (Platform.OS === 'web') {
    return (
      <View style={[{ width: size, height: size, borderRadius: size/2, backgroundColor: moodColor, opacity: 0.8 }, style]} />
    );
  }

  const c = size / 2;
  const coreR = useSharedValue(size * 0.22);      // core orb radius
  const ringR = useSharedValue(size * 0.38);      // ring radius
  const ringOpacity = useSharedValue(0.6);         // ring opacity
  const coreBlur = useSharedValue(18);             // core glow blur
  const hazeBlur = useSharedValue(size * 0.12);   // ambient haze blur

  // Ring rotation — speed differs per state
  const ringRotation = useSharedValue(0);
  const ringRotationSpeed = useSharedValue(6000);

  // Secondary ripple ring — only visible in listening/data states
  const rippleOpacity = useSharedValue(0);
  const rippleR = useSharedValue(size * 0.44);

  // ─── State-driven animation profiles ─────────────────────────────────────
  useEffect(() => {
    if (state === 'idle') {
      // Slow, even breathing
      coreR.value = withRepeat(
        withSequence(
          withTiming(size * 0.24, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
          withTiming(size * 0.20, { duration: 2800, easing: Easing.inOut(Easing.sin) })
        ),
        -1, true
      );
      ringR.value = withRepeat(
        withSequence(
          withTiming(size * 0.40, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
          withTiming(size * 0.36, { duration: 3200, easing: Easing.inOut(Easing.sin) })
        ),
        -1, true
      );
      ringOpacity.value = withTiming(0.45, { duration: 600 });
      coreBlur.value = withTiming(22, { duration: 600 });
      hazeBlur.value = withTiming(size * 0.10, { duration: 600 });
      ringRotationSpeed.value = 7000;
      rippleOpacity.value = withTiming(0, { duration: 400 });

    } else if (state === 'listening') {
      // Fast, sharp pulse — user is speaking
      coreR.value = withRepeat(
        withSequence(
          withTiming(size * 0.30, { duration: 300, easing: Easing.out(Easing.cubic) }),
          withTiming(size * 0.20, { duration: 300, easing: Easing.in(Easing.cubic) })
        ),
        -1, true
      );
      ringR.value = withRepeat(
        withSequence(
          withTiming(size * 0.46, { duration: 250, easing: Easing.out(Easing.back(1.2)) }),
          withTiming(size * 0.38, { duration: 350, easing: Easing.in(Easing.cubic) })
        ),
        -1, true
      );
      ringOpacity.value = withTiming(0.85, { duration: 300 });
      coreBlur.value = withTiming(10, { duration: 300 });
      hazeBlur.value = withTiming(size * 0.15, { duration: 300 });
      ringRotationSpeed.value = 2500;
      // Ripple ring visible
      rippleOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 400 }),
          withTiming(0, { duration: 600 })
        ),
        -1, false
      );
      rippleR.value = withRepeat(
        withSequence(
          withTiming(size * 0.38, { duration: 0 }),
          withTiming(size * 0.52, { duration: 1000, easing: Easing.out(Easing.cubic) })
        ),
        -1, false
      );

    } else if (state === 'thinking') {
      // Nervous, rapid micro-oscillation — AI is processing
      coreR.value = withRepeat(
        withSequence(
          withTiming(size * 0.23, { duration: 180, easing: Easing.inOut(Easing.ease) }),
          withTiming(size * 0.19, { duration: 180, easing: Easing.inOut(Easing.ease) })
        ),
        -1, true
      );
      ringR.value = withRepeat(
        withSequence(
          withTiming(size * 0.42, { duration: 700, easing: Easing.inOut(Easing.cubic) }),
          withTiming(size * 0.34, { duration: 700, easing: Easing.inOut(Easing.cubic) })
        ),
        -1, true
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0.75, { duration: 500 }),
          withTiming(0.35, { duration: 500 })
        ),
        -1, true
      );
      coreBlur.value = withTiming(35, { duration: 500 });
      hazeBlur.value = withTiming(size * 0.18, { duration: 500 });
      ringRotationSpeed.value = 1800;
      rippleOpacity.value = withTiming(0, { duration: 300 });

    } else if (state === 'data') {
      // Confident single expand, full glow — responding
      coreR.value = withSpring(size * 0.26, { stiffness: 180, damping: 14 });
      ringR.value = withSpring(size * 0.42, { stiffness: 200, damping: 16 });
      ringOpacity.value = withTiming(1.0, { duration: 400 });
      coreBlur.value = withTiming(14, { duration: 400 });
      hazeBlur.value = withTiming(size * 0.20, { duration: 400 });
      ringRotationSpeed.value = 4000;
      rippleOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 600 }),
          withTiming(0, { duration: 900 })
        ),
        3, false
      );
      rippleR.value = withRepeat(
        withSequence(
          withTiming(size * 0.42, { duration: 0 }),
          withTiming(size * 0.55, { duration: 1500, easing: Easing.out(Easing.cubic) })
        ),
        3, false
      );
    }
  }, [state, size]);

  // ─── Ring rotation ────────────────────────────────────────────────────────
  const rotation = useSharedValue(0);
  useEffect(() => {
    const run = () => {
      const speed = ringRotationSpeed.value;
      rotation.value = withRepeat(
        withTiming(Math.PI * 2, { duration: speed, easing: Easing.linear }),
        -1, false
      );
    };
    run();
  }, []);

  // Continuously update rotation speed by re-running periodically
  // Skia matrices use radians
  const rotationTransform = useDerivedValue(() => [{ rotate: rotation.value }]);

  // Pick ring gradient colors per state
  const ringColors = state === 'thinking'
    ? [moodColor + '00', moodColor + 'AA', moodColor + '00', '#6B8AFF88', moodColor + '00']
    : state === 'listening'
    ? [moodColor + '00', moodColor, moodColor + '00', moodColor + '88', moodColor + '00']
    : [moodColor + '00', moodColor + '99', moodColor + '00', moodColor + '44', moodColor + '00'];

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Canvas style={{ width: size, height: size }}>

        {/* ── Layer 0: Ambient haze ─────────────────── */}
        <Circle cx={c} cy={c} r={coreR}>
          <Paint>
            <RadialGradient
              c={vec(c, c)}
              r={size * 0.5}
              colors={[moodColor + '22', 'transparent']}
            />
            <BlurMask blur={hazeBlur} style="normal" />
          </Paint>
        </Circle>

        {/* ── Layer 1: Rotating sweep gradient ring ─── */}
        <Group origin={vec(c, c)} transform={rotationTransform} opacity={ringOpacity}>
          <Circle cx={c} cy={c} r={ringR}>
            <Paint style="stroke" strokeWidth={size * 0.055}>
              <SweepGradient c={vec(c, c)} colors={ringColors} />
              <BlurMask blur={8} style="normal" />
            </Paint>
          </Circle>
        </Group>

        {/* ── Layer 2: Ripple ring (listening/data states) ── */}
        <Circle cx={c} cy={c} r={rippleR} opacity={rippleOpacity}>
          <Paint style="stroke" strokeWidth={2}>
            <SweepGradient c={vec(c, c)} colors={[moodColor + '00', moodColor + '88', moodColor + '00']} />
          </Paint>
        </Circle>

        {/* ── Layer 3: Core orb ────────────────────── */}
        <Circle cx={c} cy={c} r={coreR}>
          <Paint>
            <RadialGradient
              c={vec(c, c)}
              r={size * 0.28}
              colors={[moodColor + 'CC', moodColor + '55', moodColor + '00']}
            />
            <BlurMask blur={coreBlur} style="normal" />
          </Paint>
        </Circle>

        {/* ── Layer 4: Core highlight spot ─────────── */}
        <Circle cx={c - size * 0.06} cy={c - size * 0.06} r={coreR}>
          <Paint>
            <RadialGradient
              c={vec(c - size * 0.06, c - size * 0.06)}
              r={size * 0.15}
              colors={['rgba(255,255,255,0.35)', 'transparent']}
            />
          </Paint>
        </Circle>

      </Canvas>
    </View>
  );
}
