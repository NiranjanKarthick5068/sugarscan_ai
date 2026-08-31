import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, FadeIn, FadeInUp
} from 'react-native-reanimated';
import { ArrowLeft, Clock, Send, Bot } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { chatAPI, dashboardAPI, healthAPI } from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useLiveStore } from '../../store/liveStore';
import { ChatSessionHistoryModal } from '../../components/ui/ChatSessionHistoryModal';
import { useRouter } from 'expo-router';
import { AITwinOrb } from '../../components/ui/AITwinOrb';
import { COLORS, RADII, SPACING, SHADOWS } from '../../theme/tokens';
import * as Speech from 'expo-speech';
import { Volume2, VolumeX, Mic } from 'lucide-react-native';
import { Audio } from 'expo-av';

// Icon size constants
const ICON_SM = 18;
const ICON_MD = 22;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function SendButton({ onPress, enabled }: { onPress: () => void; enabled: boolean }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { stiffness: 400, damping: 20 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { stiffness: 400, damping: 20 });
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!enabled}
      activeOpacity={1}
    >
      <Animated.View style={[
        styles.sendButton,
        { backgroundColor: enabled ? COLORS.lime : COLORS.borderLight },
        enabled && SHADOWS.limeButtonGlow,
        animatedStyle,
      ]}>
        <Send size={ICON_SM} color={enabled ? COLORS.textOnLime : COLORS.textOnLightFaint} strokeWidth={2} />
      </Animated.View>
    </TouchableOpacity>
  );
}

function MicButton({ isRecording, onToggle }: { isRecording: boolean; onToggle: () => void }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSpring(isRecording ? 1 : 0.85, { stiffness: 400, damping: 20 });
    onToggle();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1}>
      <Animated.View style={[
        styles.sendButton,
        { backgroundColor: isRecording ? COLORS.danger : COLORS.bgCard },
        isRecording && SHADOWS.elevation2,
        animatedStyle,
      ]}>
        <Mic size={ICON_SM} color={isRecording ? COLORS.textOnLight : COLORS.lime} strokeWidth={2} />
      </Animated.View>
    </TouchableOpacity>
  );
}

function MessageBubble({ msg, index }: { msg: Message; index: number }) {
  return (
    <Animated.View
      entering={FadeInUp.delay(index * 40).springify().stiffness(280).damping(26)}
      style={[
        styles.messageBubble,
        msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
      ]}
    >
      <Text style={[
        styles.messageText,
        { color: msg.role === 'user' ? COLORS.textOnLime : COLORS.textOnLight }
      ]}>
        {msg.content}
      </Text>
    </Animated.View>
  );
}

export default function ConversationScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [isStreaming, setIsStreaming] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const user = useAuthStore(s => s.user);
  const liveSeverity = useLiveStore(s => s.severity);
  const setSeverity = useLiveStore(s => s.setSeverity);

  // Stop speech if we unmount
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  // Fast fetch of initial status
  useQuery({
    queryKey: ['statusSummary'],
    queryFn: async () => {
      const data = await healthAPI.getStatusSummary();
      if (data && data.severity) {
        setSeverity(data.severity);
      }
      return data;
    },
    staleTime: 60000,
  });

  const { data: dashboardData } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardAPI.get });

  const firstName = (user?.user_metadata as any)?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const healthScore = dashboardData?.health_score?.score;
  const avgGlucose = dashboardData?.glucose?.avg;
  
  // Calculate mood color
  let activeMoodColor: string = COLORS.neon;
  if (liveSeverity === 'warning') {
    activeMoodColor = COLORS.warning;
  } else if (liveSeverity === 'critical') {
    activeMoodColor = COLORS.danger;
  }


  const toggleVoice = async () => {
    if (voiceEnabled) {
      Speech.stop();
      setVoiceEnabled(false);
    } else {
      setVoiceEnabled(true);
      Speech.speak("Voice assistant enabled.", { rate: 0.9 });
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
        setIsRecording(true);
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      // Generate a temporary message ID for the error
      const errorMsgId = Date.now().toString();
      setMessages(prev => [
        ...prev, 
        { id: errorMsgId, role: 'user', content: '⚠️ Microphone access denied or unavailable. Please check your browser/device settings.' }
      ]);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        // Show thinking immediately
        const userMsgId = Date.now().toString();
        const assistantMsgId = (Date.now() + 1).toString();
        
        // Temporarily put a placeholder for the user message
        setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: '🎙️ Transcribing...' }]);
        setIsStreaming(true);

        try {
          const text = await chatAPI.transcribeAudio(uri);
          
          if (!text.trim()) {
            setMessages(prev => prev.filter(m => m.id !== userMsgId));
            setIsStreaming(false);
            return;
          }

          // Update user message with transcription
          setMessages(prev => prev.map(m => m.id === userMsgId ? { ...m, content: text } : m));
          
          // Now send it to the LLM
          setInput(text);
          setTimeout(() => {
            sendMessage(text, userMsgId, true); // We'll modify sendMessage to accept an optional pre-set text
          }, 100);

        } catch (e) {
          console.error('Transcription failed:', e);
          setMessages(prev => prev.map(m =>
            m.id === userMsgId
              ? { ...m, content: '⚠️ Could not transcribe — check your connection and try again.' }
              : m
          ));
          setIsStreaming(false);
        }
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const sendMessage = async (overrideText?: string, existingUserMsgId?: string, isVoiceInput?: boolean) => {
    const textToSend = overrideText || input.trim();
    if (!textToSend || (isStreaming && !overrideText)) return;

    const userMsgId = existingUserMsgId || Date.now().toString();
    
    if (!existingUserMsgId) {
      const userMessage: Message = { id: userMsgId, role: 'user', content: textToSend };
      setMessages(prev => [...prev, userMessage]);
      setIsStreaming(true);
    }
    
    setInput('');

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    const timeoutMs = 45000;
    const timeout = new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error('Response timed out')), timeoutMs)
    );

    try {
      await Promise.race([
        chatAPI.streamMessage(
          textToSend,
          sessionId,
          isVoiceInput || false,
          (chunk) => {
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId ? { ...msg, content: msg.content + chunk } : msg
            ));
            scrollViewRef.current?.scrollToEnd({ animated: true });
          },
          (id) => setSessionId(id)
        ),
        timeout,
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === assistantId ? { ...msg, content: "Sorry, I couldn't process that request right now." } : msg
      ));
    } finally {
      setIsStreaming(false);
      setMessages(prev => prev.map(msg =>
        msg.id === assistantId && msg.content.trim() === ''
          ? { ...msg, content: "I didn't get a response — please try asking again." }
          : msg
      ));
      
      if (voiceEnabled) {
        setMessages(prev => {
          const finalMsg = prev.find(m => m.id === assistantId);
          if (finalMsg && finalMsg.content) {
            Speech.speak(finalMsg.content, { 
              rate: 0.9, 
              pitch: 1.0,
              onDone: () => startRecording(),
            });
          }
          return prev;
        });
      }
    }
  };

  const handleSelectSession = (session: any) => {
    setSessionId(session.id);
    if (session.messages) {
      setMessages(session.messages.map((m: any, i: number) => ({
        id: i.toString(),
        role: m.role,
        content: m.content
      })));
    } else {
      setMessages([]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['rgba(85, 88, 227, 0.1)', 'transparent']}
        style={styles.gradient}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.navButton}
          >
            <ArrowLeft size={ICON_SM} color={COLORS.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
          <AITwinOrb state={isRecording ? 'listening' : isStreaming ? 'thinking' : 'idle'} moodColor={activeMoodColor} size={40} />
          <View>
            <Text style={styles.headerTitle}>AI Twin</Text>
            <Text style={styles.headerStatus}>
              {isRecording ? 'Listening...' : isStreaming ? 'Thinking...' : 'Online'}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: SPACING.md }}>
          <TouchableOpacity
            onPress={toggleVoice}
            style={[styles.navButton, voiceEnabled && { backgroundColor: COLORS.lime, borderColor: COLORS.lime }]}
          >
            {voiceEnabled ? (
              <Volume2 size={ICON_SM} color={COLORS.bgDeep} strokeWidth={2} />
            ) : (
              <VolumeX size={ICON_SM} color={COLORS.textSecondary} strokeWidth={2} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsHistoryVisible(true)}
            style={styles.navButton}
          >
            <Clock size={ICON_SM} color={COLORS.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && (
          <Animated.View entering={FadeIn.delay(200)} style={styles.emptyState}>
            <View style={styles.orbContainer}>
              <AITwinOrb state="idle" moodColor={activeMoodColor} size={120} />
            </View>
            <Text style={styles.emptyTitle}>
              Hi {firstName}! I'm your AI Twin.
            </Text>
            {healthScore ? (
              <Text style={styles.emptySubtitle}>
                Your health score is{' '}
                <Text style={{ color: COLORS.neon, fontWeight: 'bold' }}>{healthScore}</Text>
                {avgGlucose ? ` and your average glucose is ${avgGlucose} mg/dL.` : '.'}
                {'\n\n'}How can we improve today?
              </Text>
            ) : (
              <Text style={styles.emptySubtitle}>
                Ask me about your diet, glucose trends, or how certain foods might affect you.
              </Text>
            )}
          </Animated.View>
        )}

        {messages.map((msg, index) => (
          <MessageBubble key={msg.id} msg={msg} index={index} />
        ))}

        {isStreaming && (
          <Animated.View entering={FadeIn} style={styles.thinkingIndicator}>
            <View style={styles.thinkingDot} />
            <View style={[styles.thinkingDot, { animationDelay: '200ms' }]} />
            <View style={[styles.thinkingDot, { animationDelay: '400ms' }]} />
          </Animated.View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inputWrapper}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder={isRecording ? "Listening..." : "Ask about your health..."}
            placeholderTextColor={COLORS.textTertiary}
            multiline
            value={input}
            onChangeText={setInput}
            editable={!isRecording}
          />
          {input.trim() ? (
            <SendButton onPress={() => sendMessage()} enabled={!isStreaming} />
          ) : (
            <MicButton isRecording={isRecording} onToggle={() => isRecording ? stopRecording() : startRecording()} />
          )}
        </View>
      </KeyboardAvoidingView>
      
      <ChatSessionHistoryModal
        visible={isHistoryVisible}
        onClose={() => setIsHistoryVisible(false)}
        onSelectSession={handleSelectSession}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDeep },
  gradient: { position: 'absolute', left: 0, right: 0, top: 0, height: 200 },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  headerTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: 'bold' },
  headerStatus: { color: COLORS.neon, fontSize: 12, marginTop: 1 },
  navButton: {
    width: 40, height: 40, borderRadius: RADII.avatar,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: COLORS.cardBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  divider: { height: 1, backgroundColor: COLORS.divider, marginHorizontal: SPACING.xl },
  messagesContent: { padding: SPACING.xl, paddingBottom: 140, gap: SPACING.md },
  emptyState: { alignItems: 'center', marginTop: 40 },
  orbContainer: { marginBottom: SPACING.xxl },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: SPACING.sm, textAlign: 'center' },
  emptySubtitle: { color: COLORS.textSecondary, textAlign: 'center', fontSize: 15, lineHeight: 24, paddingHorizontal: 16 },
  messageBubble: {
    maxWidth: '85%',
    padding: SPACING.base,
    borderRadius: RADII.card,
    borderWidth: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.lime,
    borderColor: 'transparent',
    borderBottomRightRadius: RADII.sm,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.borderLight,
    borderBottomLeftRadius: RADII.sm,
  },
  messageText: { fontSize: 15, lineHeight: 23 },
  thinkingIndicator: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    padding: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginTop: 4,
  },
  thinkingDot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.lime, opacity: 0.7,
  },
  inputWrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.xxl,
    backgroundColor: COLORS.bgDeep,
    borderTopWidth: 1,
    borderColor: COLORS.divider,
  },
  inputRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-end' },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADII.card,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.base,
    paddingBottom: SPACING.base,
    color: COLORS.textOnLight,
    fontSize: 15,
    maxHeight: 120,
  },
  sendButton: {
    width: 48, height: 48, borderRadius: RADII.avatar,
    justifyContent: 'center', alignItems: 'center',
  },
  textPrimary: { color: COLORS.textPrimary },
  bgDeep: { backgroundColor: COLORS.bgDeep },
});
