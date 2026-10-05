import { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, StyleSheet, Image, Alert, Linking, Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { THEME, buildCallUrl, isCallMessage, isCallActive } from '@hajj/shared';
import { useConfirm } from '../../ui/ConfirmContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FONTS } from '../../hooks/useAppFonts.js';
import { toFormFile } from '../../utils/filePart.js';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { useRealtime } from '../../hooks/useRealtime.js';
import { chatState } from '../../utils/chatState.js';

export default function GroupChatScreen(props) {
  const { api, apiBaseUrl, user } = useAuth();
  const { t, formatDateTime } = useLanguage();
  const route = useRoute();
  const confirm = useConfirm();
  const canCall = ['encadreur', 'agence'].includes(user?.role); // c'est l'encadreur qui choisit audio ou visio
  const params = { ...(route.params ?? {}), ...props }; // props : utilisé par « Mon groupe » (pèlerin)
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [media, setMedia] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  const refresh = useRef(() => {});
  const lastRead = useRef(0);

  // Discussion ouverte : on la marque lue à chaque nouveau message (le badge « Mon groupe » retombe à 0).
  useEffect(() => {
    chatState.openGroupId = Number(params.groupId);
    return () => { chatState.openGroupId = null; };
  }, [params.groupId]);
  useEffect(() => {
    const last = messages[messages.length - 1]?.id ?? 0;
    if (last > lastRead.current) { lastRead.current = last; api.groups.markRead(params.groupId).catch(() => {}); }
  }, [messages, api, params.groupId]);
  useEffect(() => {
    let active = true;
    refresh.current = () => api.groups.listMessages(params.groupId)
      .then((data) => { if (active) { setMessages((current) => { const next = data.messages ?? []; return current.length === next.length && current[current.length - 1]?.id === next[next.length - 1]?.id ? current : next; }); setError(''); } })
      .catch(() => { if (active) setError(t('chat_fetchError')); });
    refresh.current();
    const interval = setInterval(() => refresh.current(), 20000); // filet de sécurité si le flux temps réel est coupé
    return () => { active = false; clearInterval(interval); };
  }, [api, params.groupId]);

  // Temps réel : un nouveau message du groupe déclenche une relecture immédiate (sondage 4 s si SSE indisponible).
  useRealtime({ 'group:message': (event) => { if (event.polled || Number(event.groupe_id) === Number(params.groupId)) refresh.current(); } }, { groups: [Number(params.groupId)] });

  async function chooseMedia() {
    if (Platform.OS === 'web') return pickFile(); // pas de menu à boutons sur le web : sélecteur de fichiers direct
    Alert.alert(t('mob_attachTitle'), t('mob_attachChoose'), [
      { text: t('mob_gallery'), onPress: pickFromGallery },
      { text: t('mob_fileVideo'), onPress: pickFile },
      { text: t('cancel'), style: 'cancel' },
    ]);
  }

  async function pickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert(t('mob_permissionDenied'), t('mob_galleryPermission'));
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
    if (!result.canceled) {
      const asset = result.assets[0];
      setMedia({ uri: asset.uri, name: asset.fileName || `groupe-${Date.now()}`, type: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg') });
    }
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf', 'video/*'] });
    if (!result.canceled) {
      const asset = result.assets[0];
      setMedia({ uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/octet-stream' });
    }
  }

  async function send() {
    if ((!content.trim() && !media) || sending) return;
    setSending(true);
    const formData = new FormData();
    if (content.trim()) formData.append('contenu', content.trim());
    if (media) formData.append('media', await toFormFile({ uri: media.uri, name: media.name, mimeType: media.type }));
    try {
      await api.groups.sendMessage(params.groupId, formData);
      const data = await api.groups.listMessages(params.groupId);
      setMessages(data.messages ?? []);
      setContent('');
      setMedia(null);
      setError('');
    } catch (requestError) {
      setError(requestError?.status === 400 && requestError.message ? requestError.message : t('chat_sendError')); // ex. « Type de média non supporté »
    } finally { setSending(false); }
  }

  const fullName = `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim();
  const joinCall = (item) => Linking.openURL(buildCallUrl(item.media_url, item.media_type === 'call/audio' ? 'audio' : 'video', fullName));

  async function startCall(kind) {
    const ok = await confirm({ title: kind === 'audio' ? t('call_audioStart') : t('call_videoStart'), message: t('call_confirm'), confirmLabel: t('call_start') });
    if (!ok) return;
    try {
      const result = await api.groups.startCall(params.groupId, kind);
      refresh.current();
      Linking.openURL(buildCallUrl(result.url, kind, fullName)); // l'encadreur rejoint tout de suite sa salle
    } catch { setError(t('call_error')); }
  }

  async function endCall() {
    try { await api.groups.endCall(params.groupId); refresh.current(); } catch { setError(t('call_error')); }
  }

  function mediaUrl(path) {
    return /^https?:\/\//i.test(path) ? path : `${apiBaseUrl}${path}`;
  }

  return <View style={styles.flex}>
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      ListHeaderComponent={<><Text style={styles.title}>{params.groupName}</Text>{canCall ? <View style={styles.callRow}>
        <Pressable onPress={() => startCall('audio')} accessibilityRole="button" style={styles.callBtn}><Text style={styles.callBtnText}>📞 {t('call_audio')}</Text></Pressable>
        <Pressable onPress={() => startCall('video')} accessibilityRole="button" style={styles.callBtn}><Text style={styles.callBtnText}>🎥 {t('call_video')}</Text></Pressable>
      </View> : null}{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}</>}
      renderItem={({ item }) => {
        const mine = Number(item.expediteur_id) === Number(user?.id);
        const attachmentUri = item.media_url ? mediaUrl(item.media_url) : null;
        if (isCallMessage(item)) {
          const active = isCallActive(item);
          return <View style={[styles.callCard, !active && { opacity: 0.6 }]}>
            <Text style={styles.callTitle}>{item.media_type === 'call/video' ? '🎥' : item.media_type === 'call/audio' ? '📞' : '📴'} {active ? (item.media_type === 'call/video' ? t('call_videoOngoing') : t('call_audioOngoing')) : t('call_ended')}</Text>
            <Text style={styles.sender}>{t('call_by', { name: item.expediteur_nom })} · {formatDateTime(item.cree_le)}</Text>
            {active ? <View style={styles.callRow}>
              <Pressable onPress={() => joinCall(item)} accessibilityRole="button" style={[styles.callBtn, styles.callJoin]}><Text style={[styles.callBtnText, { color: '#fff' }]}>{t('call_join')}</Text></Pressable>
              {canCall ? <Pressable onPress={endCall} accessibilityRole="button" style={styles.callBtn}><Text style={styles.callBtnText}>{t('call_end')}</Text></Pressable> : null}
            </View> : null}
          </View>;
        }
        return <View style={[styles.message, mine && styles.mine]}>
          <Text style={styles.sender}>{item.expediteur_nom}</Text>
          {item.contenu ? <Text style={styles.body}>{item.contenu}</Text> : null}
          {item.media_url && item.media_type?.startsWith('image/') ? <Pressable onPress={() => Linking.openURL(attachmentUri)}><Image source={{ uri: attachmentUri }} accessibilityLabel={item.media_nom || t('chat_imageAlt')} style={styles.image} resizeMode="cover" /></Pressable> : null}
          {item.media_url && !item.media_type?.startsWith('image/') ? <Pressable onPress={() => Linking.openURL(attachmentUri)}><Text style={styles.media}>{item.media_nom || t('chat_openDoc')}</Text></Pressable> : null}
          <Text style={styles.time}>{formatDateTime(item.cree_le)}</Text>
        </View>;
      }}
      ListEmptyComponent={<Text style={styles.empty}>{t('chat_empty')}</Text>}
    />
    <View style={styles.composer}>
      <View style={styles.composerMain}>
        <TextInput value={content} onChangeText={setContent} placeholder={t('chat_placeholder')} style={styles.input} multiline />
        {media ? <View style={styles.preview}>
          {media.type.startsWith('image/') ? <Image source={{ uri: media.uri }} accessibilityLabel={t('chat_previewAlt', { name: media.name })} style={styles.previewImage} resizeMode="cover" />
            : <View style={styles.previewFile}><Text style={styles.previewFileType}>{media.type.startsWith('video/') ? 'VIDEO' : t('chat_document')}</Text></View>}
          <View style={styles.previewInfo}><Text style={styles.previewTitle}>{t('chat_previewTitle')}</Text><Text numberOfLines={1} style={styles.selectedMedia}>{media.name}</Text></View>
          <Pressable onPress={() => setMedia(null)} accessibilityLabel={t('chat_removeAria')} style={styles.removeButton}><Text style={styles.remove}>×</Text></Pressable>
        </View> : null}
        <View style={styles.actions}>
          <Pressable onPress={chooseMedia} accessibilityLabel={t('chat_attach')} style={styles.attach}><Text style={styles.attachText}>{media ? t('chat_changeMedia') : `+ ${t('chat_attach')}`}</Text></Pressable>
          {media ? <Pressable onPress={() => setMedia(null)} accessibilityLabel={t('chat_removeAria')}><Text style={styles.remove}>{t('chat_remove')}</Text></Pressable> : null}
        </View>
      </View>
      <Pressable onPress={send} disabled={sending || (!content.trim() && !media)} style={[styles.button, (sending || (!content.trim() && !media)) && styles.disabled]}><Text style={styles.buttonText}>{sending ? '…' : t('chat_send')}</Text></Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: THEME.colors.background },
  list: { flexGrow: 1, padding: THEME.spacing.lg },
  title: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes['2xl'], color: THEME.colors.textPrimary, marginBottom: THEME.spacing.lg },
  message: { alignSelf: 'flex-start', maxWidth: '88%', backgroundColor: THEME.colors.surfaceMuted, borderRadius: THEME.radius.md, padding: THEME.spacing.md, marginBottom: THEME.spacing.sm },
  mine: { alignSelf: 'flex-end', backgroundColor: THEME.colors.primaryTint },
  sender: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary },
  body: { fontFamily: FONTS.bodyRegular, color: THEME.colors.textPrimary, marginTop: 4 },
  image: { width: 230, height: 180, marginTop: 8, borderRadius: THEME.radius.sm, backgroundColor: THEME.colors.border },
  media: { color: THEME.colors.primary, marginTop: 8, textDecorationLine: 'underline' },
  time: { color: THEME.colors.textSecondary, fontSize: 10, marginTop: 6 },
  callRow: { flexDirection: 'row', gap: 8, marginBottom: THEME.spacing.md, flexWrap: 'wrap' },
  callBtn: { borderWidth: 1, borderColor: THEME.colors.primary, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  callJoin: { backgroundColor: THEME.colors.primary },
  callBtnText: { color: THEME.colors.primary, fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.sm },
  callCard: { alignSelf: 'stretch', backgroundColor: THEME.colors.primaryTint, borderRadius: THEME.radius.md, padding: THEME.spacing.md, marginBottom: THEME.spacing.sm, gap: 6 },
  callTitle: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes.base, color: THEME.colors.textPrimary },
  empty: { color: THEME.colors.textSecondary, textAlign: 'center', marginTop: 40 },
  error: { color: THEME.colors.danger, marginBottom: THEME.spacing.md },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: THEME.spacing.md, backgroundColor: THEME.colors.surface, borderTopWidth: 1, borderTopColor: THEME.colors.border },
  composerMain: { flex: 1, minWidth: 0 },
  input: { minHeight: 44, maxHeight: 110, borderWidth: 1, borderColor: THEME.colors.border, borderRadius: THEME.radius.sm, padding: 10, color: THEME.colors.textPrimary },
  selectedMedia: { color: THEME.colors.textSecondary, fontSize: THEME.typography.sizes.xs, marginTop: 6 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, padding: 8, borderRadius: THEME.radius.md, backgroundColor: THEME.colors.primaryTint },
  previewImage: { width: 64, height: 56, borderRadius: THEME.radius.sm, backgroundColor: THEME.colors.surface },
  previewFile: { width: 64, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: THEME.radius.sm, backgroundColor: THEME.colors.surface },
  previewFileType: { color: THEME.colors.primary, fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.xs },
  previewInfo: { flex: 1, minWidth: 0 },
  previewTitle: { color: THEME.colors.primary, fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.xs },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  attach: { paddingVertical: 4, paddingRight: 8 },
  attachText: { color: THEME.colors.primary, fontFamily: FONTS.bodyMedium, fontSize: THEME.typography.sizes.xs },
  removeButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: THEME.radius.sm, backgroundColor: THEME.colors.surface },
  remove: { color: THEME.colors.danger, fontSize: THEME.typography.sizes.xs },
  button: { backgroundColor: THEME.colors.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: THEME.radius.sm },
  disabled: { opacity: 0.5 },
  buttonText: { color: THEME.colors.textOnPrimary, fontFamily: FONTS.bodySemibold },
});
