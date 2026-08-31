/**
 * AssistantBottomSheet — compact inline chat with the AI assistant.
 * Slides up as a bottom sheet over the current screen.
 * Re-uses the same SSE streaming chat as conversation.tsx.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Modal, Pressable,
} from 'react-native';
import Animated, { SlideInDown, FadeIn } from 'react-native-reanimated';
import { X, Send, Bot } from 'lucide-react-native';
import { COLORS, RADII, SHADOWS, TYPE } from '../../theme/tokens';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

import { API_URL } from '../../lib/apiConfig';

interface AssistantBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function AssistantBottomSheet({ visible, onClose }: AssistantBottomSheetProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your AI health assistant. Ask me anything about your glucose levels, meals, or health plan.",
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    try {
      const resp = await fetch(`${API_URL}/api/v1/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!resp.body) throw new Error('No stream body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsg.id
                ? { ...m, content: m.content + chunk }
                : m
            )
          );
        }
      }
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: 'Sorry, I could not connect to the AI right now.' }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  }, [input, streaming]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kvContainer}>
        <Animated.View entering={SlideInDown.springify().damping(22).stiffness(180)} style={styles.sheet}>
          {/* Handle + Header */}
          <View style={styles.grabber} />
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.botIcon}>
                <Bot size={18} color={COLORS.textOnLime} />
              </View>
              <Text style={styles.headerTitle}>AI Assistant</Text>
              {streaming && (
                <View style={styles.typingDot} />
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={COLORS.textOnLight} />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.messages}
            showsVerticalScrollIndicator={false}
          >
            {messages.map(msg => (
              <Animated.View
                key={msg.id}
                entering={FadeIn.duration(200)}
                style={[
                  styles.bubble,
                  msg.role === 'user' ? styles.userBubble : styles.aiBubble,
                ]}
              >
                <Text style={msg.role === 'user' ? styles.userText : styles.aiText}>
                  {msg.content || (streaming && msg.role === 'assistant' ? '…' : '')}
                </Text>
              </Animated.View>
            ))}
          </ScrollView>

          {/* Input Row */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Ask your AI assistant..."
              placeholderTextColor={COLORS.textOnLightFaint}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!input.trim() || streaming}
              style={[styles.sendBtn, (!input.trim() || streaming) && styles.sendBtnDisabled]}
            >
              <Send size={18} color={COLORS.textOnLime} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:       { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,26,26,0.45)' },
  kvContainer:    { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADII.sheetTop,
    borderTopRightRadius: RADII.sheetTop,
    paddingBottom: 34,
    maxHeight: '70%',
    ...SHADOWS.cardOnLightRaised,
  },
  grabber:        { width: 44, height: 5, borderRadius: 3, backgroundColor: COLORS.borderLight, alignSelf: 'center', marginVertical: 10 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderColor: COLORS.borderLight },
  headerLeft:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  botIcon:        { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.lime, alignItems: 'center', justifyContent: 'center' },
  headerTitle:    { ...TYPE.bodyStrong },
  typingDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.lime },
  closeBtn:       { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.bgCardAlt, alignItems: 'center', justifyContent: 'center' },
  messages:       { padding: 16, gap: 10, paddingBottom: 4 },
  bubble:         { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  userBubble:     { alignSelf: 'flex-end', backgroundColor: COLORS.lime, borderBottomRightRadius: 4 },
  aiBubble:       { alignSelf: 'flex-start', backgroundColor: COLORS.bgCardAlt, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.borderLight },
  userText:       { ...TYPE.body, color: COLORS.textOnLime, fontSize: 14 },
  aiText:         { ...TYPE.body, color: COLORS.textOnLight, fontSize: 14 },
  inputRow:       { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 12, gap: 10, borderTopWidth: 1, borderColor: COLORS.borderLight },
  input:          { flex: 1, maxHeight: 100, backgroundColor: COLORS.bgCardAlt, borderWidth: 1.5, borderColor: COLORS.borderLight, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, ...TYPE.body, color: COLORS.textOnLight },
  sendBtn:        { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.lime, alignItems: 'center', justifyContent: 'center', ...SHADOWS.limeButtonGlow },
  sendBtnDisabled:{ opacity: 0.45, ...SHADOWS.elevation1 },
});
