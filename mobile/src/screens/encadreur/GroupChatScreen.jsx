import { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FONTS } from '../../hooks/useAppFonts.js';

export default function GroupChatScreen() {
  const { api, user } = useAuth();
  const { params } = useRoute();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  useEffect(() => { api.groups.listMessages(params.groupId).then((data) => setMessages(data.messages ?? [])).catch(() => setMessages([])); }, [api, params.groupId]);
  async function send() { if (!content.trim()) return; const formData = new FormData(); formData.append('contenu', content.trim()); await api.groups.sendMessage(params.groupId, formData); setContent(''); const data = await api.groups.listMessages(params.groupId); setMessages(data.messages ?? []); }
  return <View style={styles.flex}><FlatList data={messages} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.list} ListHeaderComponent={<Text style={styles.title}>{params.groupName}</Text>} renderItem={({ item }) => <View style={[styles.message, item.expediteur_id === user?.id && styles.mine]}><Text style={styles.sender}>{item.expediteur_nom}</Text>{item.contenu && <Text style={styles.body}>{item.contenu}</Text>}{item.media_url && <Text style={styles.media}>{item.media_nom || 'Media attachment'}</Text>}</View>} ListEmptyComponent={<Text style={styles.empty}>No messages yet.</Text>} /><View style={styles.composer}><TextInput value={content} onChangeText={setContent} placeholder="Write an update..." style={styles.input} multiline /><Pressable onPress={send} style={styles.button}><Text style={styles.buttonText}>Send</Text></Pressable></View></View>;
}
const styles = StyleSheet.create({ flex: { flex: 1, backgroundColor: THEME.colors.background }, list: { padding: THEME.spacing.lg }, title: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes['2xl'], color: THEME.colors.textPrimary, marginBottom: THEME.spacing.lg }, message: { alignSelf: 'flex-start', maxWidth: '85%', backgroundColor: THEME.colors.surfaceMuted, borderRadius: THEME.radius.md, padding: THEME.spacing.md, marginBottom: THEME.spacing.sm }, mine: { alignSelf: 'flex-end', backgroundColor: THEME.colors.primaryTint }, sender: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary }, body: { fontFamily: FONTS.bodyRegular, color: THEME.colors.textPrimary, marginTop: 4 }, media: { color: THEME.colors.primary, marginTop: 4 }, empty: { color: THEME.colors.textSecondary }, composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: THEME.spacing.md, backgroundColor: THEME.colors.surface, borderTopWidth: 1, borderTopColor: THEME.colors.border }, input: { flex: 1, minHeight: 44, maxHeight: 110, borderWidth: 1, borderColor: THEME.colors.border, borderRadius: THEME.radius.sm, padding: 10, color: THEME.colors.textPrimary }, button: { backgroundColor: THEME.colors.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: THEME.radius.sm }, buttonText: { color: THEME.colors.textOnPrimary, fontFamily: FONTS.bodySemibold } });
