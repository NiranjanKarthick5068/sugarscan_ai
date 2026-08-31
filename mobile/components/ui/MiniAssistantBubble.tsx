/**
 * MiniAssistantBubble — a persistent draggable button that floats above all tab screens.
 * On tap it slides up AssistantBottomSheet.
 * Docked corner is saved in AsyncStorage.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, PanResponder, Animated as RNAnimated,
  TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle } from 'lucide-react-native';
import { COLORS, RADII, SHADOWS } from '../../theme/tokens';
import { AssistantBottomSheet } from './AssistantBottomSheet';

const STORAGE_KEY = '@assistant_bubble_xy';
const BUBBLE_SIZE = 60;
const EDGE_MARGIN = 20;

export function MiniAssistantBubble() {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = Dimensions.get('window');
  const [sheetOpen, setSheetOpen] = useState(false);

  const pos = useRef(new RNAnimated.ValueXY({ x: W - BUBBLE_SIZE - EDGE_MARGIN, y: H - 160 })).current;
  const isDragging = useRef(false);
  const lastPos = useRef({ x: W - BUBBLE_SIZE - EDGE_MARGIN, y: H - 160 });

  // Restore persisted position
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        pos.setValue(saved);
        lastPos.current = saved;
      } catch { /* ignore */ }
    });
  }, []);

  const persistPos = useCallback(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lastPos.current));
  }, []);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
    onPanResponderGrant: () => {
      isDragging.current = false;
      pos.setOffset(lastPos.current);
      pos.setValue({ x: 0, y: 0 });
    },
    onPanResponderMove: (_, g) => {
      if (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4) isDragging.current = true;
      RNAnimated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false })(_, g);
    },
    onPanResponderRelease: (_, g) => {
      pos.flattenOffset();
      const cx = (pos.x as any)._value as number;
      const cy = (pos.y as any)._value as number;

      // Snap to nearest horizontal edge
      const snapX = cx + BUBBLE_SIZE / 2 < W / 2 ? EDGE_MARGIN : W - BUBBLE_SIZE - EDGE_MARGIN;
      const snapY = Math.max(insets.top + 60, Math.min(cy, H - insets.bottom - BUBBLE_SIZE - 80));

      RNAnimated.spring(pos, {
        toValue: { x: snapX, y: snapY },
        useNativeDriver: false,
        tension: 120,
        friction: 10,
      }).start(() => {
        lastPos.current = { x: snapX, y: snapY };
        persistPos();
      });

      if (!isDragging.current) {
        setSheetOpen(true);
      }
    },
  });

  return (
    <>
      <RNAnimated.View
        style={[styles.bubble, { transform: pos.getTranslateTransform() }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.bubbleInner}>
          <MessageCircle size={26} color={COLORS.textOnLime} strokeWidth={2.5} />
        </View>
      </RNAnimated.View>

      <AssistantBottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 20,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
  },
  bubbleInner: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: RADII.avatar,
    backgroundColor: COLORS.lime,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.limeButtonGlow,
  },
});
