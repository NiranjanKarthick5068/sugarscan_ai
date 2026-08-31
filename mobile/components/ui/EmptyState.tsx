import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Inbox, WifiOff, AlertCircle, RefreshCw } from 'lucide-react-native';
import { COLORS } from '../../theme/tokens';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  message?: string;
  variant?: 'empty' | 'error' | 'offline';
  onRetry?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

const VARIANTS = {
  empty: {
    icon: (size: number, color: string) => <Inbox size={size} color={color} />,
    title: 'No Data Available',
    message: 'Data will appear here once you start tracking.',
    color: COLORS.textTertiary,
  },
  error: {
    icon: (size: number, color: string) => <AlertCircle size={size} color={color} />,
    title: 'Something Went Wrong',
    message: 'Unable to load data. Please try again.',
    color: COLORS.danger,
  },
  offline: {
    icon: (size: number, color: string) => <WifiOff size={size} color={color} />,
    title: "You're Offline",
    message: 'Check your connection and try again.',
    color: COLORS.warning,
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  variant = 'empty',
  onRetry,
  compact = false,
  style,
}) => {
  const v = VARIANTS[variant];
  const iconSize = compact ? 24 : 32;

  return (
    <Animated.View entering={FadeInUp.duration(300)} style={[styles.container, compact ? styles.compact : styles.normal, style]}>
      <View style={[styles.iconContainer, { width: compact ? 48 : 64, height: compact ? 48 : 64, backgroundColor: `${v.color}12` }]}>
        {icon || v.icon(iconSize, v.color)}
      </View>
      <Text style={[styles.title, { fontSize: compact ? 13 : 15 }]}>{title || v.title}</Text>
      <Text style={[styles.message, { fontSize: compact ? 11 : 12 }]}>{message || v.message}</Text>
      
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.7}>
          <RefreshCw size={12} color={COLORS.textOnLight} />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  normal: {
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  iconContainer: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontWeight: 'bold',
    color: COLORS.textOnLight,
    marginBottom: 4,
    textAlign: 'center',
  },
  message: {
    color: COLORS.textTertiary,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCardAlt,
    borderColor: COLORS.borderLight,
    borderWidth: 1,
    borderRadius: 9999,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textOnLight,
    marginLeft: 6,
  },
});
