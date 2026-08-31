import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { X, Clock, MessageSquare } from 'lucide-react-native';
import { chatAPI } from '../../services/api';
import { format } from 'date-fns';
import { COLORS, RADII, SPACING, SHADOWS } from '../../theme/tokens';

const ICON_SM = 16;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectSession: (session: any) => void;
}

export const ChatSessionHistoryModal = ({ visible, onClose, onSelectSession }: Props) => {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: chatAPI.sessions,
    enabled: visible
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.grabber} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Chat History</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={ICON_SM} color={COLORS.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {isLoading ? (
            <ActivityIndicator color={COLORS.neon} style={{ marginTop: 48 }} />
          ) : !sessions || sessions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MessageSquare size={32} color={COLORS.textTertiary} strokeWidth={1.5} />
              <Text style={styles.emptyText}>No past conversations found.</Text>
            </View>
          ) : (
            <FlatList
              data={sessions}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeInUp.delay(index * 40).springify()}>
                  <TouchableOpacity
                    style={styles.sessionRow}
                    onPress={() => {
                      onSelectSession(item);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sessionIcon}>
                      <MessageSquare size={ICON_SM} color={COLORS.neon} strokeWidth={2} />
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionTitle} numberOfLines={1}>
                        {item.title || 'Conversation'}
                      </Text>
                      <View style={styles.sessionMeta}>
                        <Clock size={10} color={COLORS.textTertiary} strokeWidth={2} />
                        <Text style={styles.sessionDate}>
                          {format(new Date(item.last_message_at || new Date()), 'MMM d, yyyy · h:mm a')}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.bgPrimary,
    borderTopLeftRadius: RADII.sheetTop,
    borderTopRightRadius: RADII.sheetTop,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.cardBorder,
    paddingTop: SPACING.md,
    maxHeight: '80%',
    minHeight: '45%',
    ...SHADOWS.elevation2,
  },
  grabber: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.cardBorder,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: 'bold' },
  closeButton: {
    width: 32, height: 32, borderRadius: RADII.avatar,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: COLORS.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: COLORS.divider, marginHorizontal: SPACING.xl },
  listContent: { gap: SPACING.sm, paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: 48 },
  emptyContainer: { alignItems: 'center', marginTop: 48, gap: SPACING.md },
  emptyText: { color: COLORS.textTertiary, fontSize: 13, textAlign: 'center' },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.base,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sessionIcon: {
    width: 36, height: 36, borderRadius: RADII.chip,
    backgroundColor: COLORS.neonSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  sessionInfo: { flex: 1 },
  sessionTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  sessionDate: { color: COLORS.textTertiary, fontSize: 11 },
});
