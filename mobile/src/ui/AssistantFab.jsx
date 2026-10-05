import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { THEME, assistantReply, assistantStrings } from '@hajj/shared';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { FONTS } from '../hooks/useAppFonts.js';

/** Bouton flottant « Assistant IA » (démo) : fenêtre de discussion aux réponses simulées. */
export default function AssistantFab({ hidden = false }) {
  const { language, isRTL } = useLanguage();
  const kb = assistantStrings(language);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef(null);
  const nextId = useRef(1);

  useEffect(() => { setMessages([{ id: 0, from: 'bot', text: kb.welcome }]); }, [language]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (hidden) setOpen(false); }, [hidden]);

  function ask(question) {
    const value = (question ?? text).trim();
    if (!value || typing) return;
    setText('');
    setMessages((current) => [...current, { id: nextId.current++, from: 'me', text: value }]);
    setTyping(true);
    setTimeout(() => {
      setMessages((current) => [...current, { id: nextId.current++, from: 'bot', text: assistantReply(language, value) }]);
      setTyping(false);
    }, 650);
  }

  if (hidden) return null;
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {open ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none" style={styles.sheetWrap}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.headerIcon}>🤖</Text>
              <View style={styles.flex1}><Text style={styles.headerTitle}>{kb.title}</Text></View>
              <View style={styles.demoBadge}><Text style={styles.demoText}>{kb.demo}</Text></View>
              <Pressable onPress={() => setOpen(false)} accessibilityLabel="Close" style={styles.closeBtn}><Text style={styles.close}>×</Text></Pressable>
            </View>
            <FlatList
              ref={listRef}
              data={typing ? [...messages, { id: 'typing', from: 'bot', text: kb.thinking }] : messages}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.list}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item }) => (
                <View style={[styles.bubble, item.from === 'me' ? styles.mine : styles.bot, item.from === 'me' ? (isRTL ? styles.start : styles.end) : (isRTL ? styles.end : styles.start)]}>
                  <Text style={[styles.bubbleText, item.from === 'me' && { color: '#fff' }, item.id === 'typing' && { fontStyle: 'italic' }]}>{item.text}</Text>
                </View>
              )}
              ListFooterComponent={messages.length <= 1 ? (
                <View style={styles.suggestions}>
                  {kb.suggestions.map((suggestion) => (
                    <Pressable key={suggestion} onPress={() => ask(suggestion)} style={styles.suggestion}><Text style={styles.suggestionText}>{suggestion}</Text></Pressable>
                  ))}
                </View>
              ) : null}
            />
            <View style={styles.composer}>
              <TextInput value={text} onChangeText={setText} placeholder={kb.placeholder} onSubmitEditing={() => ask()} returnKeyType="send" style={styles.input} accessibilityLabel={kb.placeholder} />
              <Pressable onPress={() => ask()} disabled={!text.trim() || typing} style={[styles.send, (!text.trim() || typing) && { opacity: 0.5 }]}><Text style={styles.sendText}>{kb.send}</Text></Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : null}
      {!open ? (
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={kb.title} style={[styles.fab, isRTL ? { left: 16 } : { right: 16 }]}>
          <Text style={styles.fabIcon}>🤖</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  fab: { position: 'absolute', bottom: 88, width: 58, height: 58, borderRadius: 29, backgroundColor: THEME.colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8, zIndex: 50 },
  fabIcon: { fontSize: 28 },
  sheetWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.25)', zIndex: 60 },
  sheet: { height: '72%', backgroundColor: THEME.colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: THEME.colors.primary },
  headerIcon: { fontSize: 24 },
  headerTitle: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes.lg, color: '#fff' },
  demoBadge: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  demoText: { fontFamily: FONTS.bodySemibold, fontSize: 10, color: '#fff', letterSpacing: 1 },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  close: { color: '#fff', fontSize: 28, lineHeight: 30 },
  list: { padding: 14, gap: 8 },
  bubble: { maxWidth: '86%', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 13 },
  start: { alignSelf: 'flex-start' },
  end: { alignSelf: 'flex-end' },
  bot: { backgroundColor: THEME.colors.surfaceMuted },
  mine: { backgroundColor: THEME.colors.primary },
  bubbleText: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.sm, lineHeight: 20, color: THEME.colors.textPrimary },
  suggestions: { gap: 8, marginTop: 8 },
  suggestion: { alignSelf: 'flex-start', borderWidth: 1, borderColor: THEME.colors.primary, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  suggestionText: { fontFamily: FONTS.bodyMedium, fontSize: THEME.typography.sizes.sm, color: THEME.colors.primary },
  composer: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: THEME.colors.border, backgroundColor: THEME.colors.surface },
  input: { flex: 1, borderWidth: 1, borderColor: THEME.colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, color: THEME.colors.textPrimary },
  send: { backgroundColor: THEME.colors.primary, borderRadius: 999, paddingHorizontal: 16, justifyContent: 'center' },
  sendText: { color: '#fff', fontFamily: FONTS.bodySemibold },
});
