import { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, StyleSheet, Image, Alert, Linking } from 'react-native';
import { useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FONTS } from '../../hooks/useAppFonts.js';

export default function GroupChatScreen() {
  const { api, apiBaseUrl, user } = useAuth();
  const { params } = useRoute();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [media, setMedia] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    let active = true;
    const refresh = () => api.groups.listMessages(params.groupId)
      .then((data) => { if (active) setMessages(data.messages ?? []); })
      .catch(() => { if (active) setError('Impossible de récupérer les messages.'); });
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [api, params.groupId]);

  async function chooseMedia() {
    Alert.alert('Joindre un média', 'Choisis une source', [
      { text: 'Galerie', onPress: pickFromGallery },
      { text: 'Fichier ou vidéo', onPress: pickFile },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  async function pickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permission refusée', 'Autorise l’accès à la galerie pour joindre une image ou une vidéo.');
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
    if (media) formData.append('media', media);
    try {
      await api.groups.sendMessage(params.groupId, formData);
      const data = await api.groups.listMessages(params.groupId);
      setMessages(data.messages ?? []);
      setContent('');
      setMedia(null);
      setError('');
    } catch {
      setError('Le message n’a pas pu être envoyé. Réessaie.');
    } finally { setSending(false); }
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
      ListHeaderComponent={<><Text style={styles.title}>{params.groupName}</Text>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}</>}
      renderItem={({ item }) => {
        const mine = Number(item.expediteur_id) === Number(user?.id);
        const attachmentUri = item.media_url ? mediaUrl(item.media_url) : null;
        return <View style={[styles.message, mine && styles.mine]}>
          <Text style={styles.sender}>{item.expediteur_nom}</Text>
          {item.contenu ? <Text style={styles.body}>{item.contenu}</Text> : null}
          {item.media_url && item.media_type?.startsWith('image/') ? <Pressable onPress={() => Linking.openURL(attachmentUri)}><Image source={{ uri: attachmentUri }} accessibilityLabel={item.media_nom || 'Image partagée'} style={styles.image} resizeMode="cover" /></Pressable> : null}
          {item.media_url && !item.media_type?.startsWith('image/') ? <Pressable onPress={() => Linking.openURL(attachmentUri)}><Text style={styles.media}>{item.media_nom || 'Ouvrir le média'}</Text></Pressable> : null}
          <Text style={styles.time}>{new Date(item.cree_le).toLocaleString('fr-FR')}</Text>
        </View>;
      }}
      ListEmptyComponent={<Text style={styles.empty}>Aucun message. Envoyez la première information au groupe.</Text>}
    />
    <View style={styles.composer}>
      <View style={styles.composerMain}>
        <TextInput value={content} onChangeText={setContent} placeholder="Écrire un message…" style={styles.input} multiline />
        {media ? <View style={styles.preview}>
          {media.type.startsWith('image/') ? <Image source={{ uri: media.uri }} accessibilityLabel={`Aperçu : ${media.name}`} style={styles.previewImage} resizeMode="cover" />
            : <View style={styles.previewFile}><Text style={styles.previewFileType}>{media.type.startsWith('video/') ? 'VIDÉO' : 'DOCUMENT'}</Text></View>}
          <View style={styles.previewInfo}><Text style={styles.previewTitle}>Aperçu avant envoi</Text><Text numberOfLines={1} style={styles.selectedMedia}>{media.name}</Text></View>
          <Pressable onPress={() => setMedia(null)} accessibilityLabel="Retirer le média sélectionné" style={styles.removeButton}><Text style={styles.remove}>×</Text></Pressable>
        </View> : null}
        <View style={styles.actions}>
          <Pressable onPress={chooseMedia} accessibilityLabel="Joindre un média" style={styles.attach}><Text style={styles.attachText}>{media ? 'Changer le fichier' : '+ Joindre un média'}</Text></Pressable>
          {media ? <Pressable onPress={() => setMedia(null)} accessibilityLabel="Retirer la pièce jointe"><Text style={styles.remove}>Retirer</Text></Pressable> : null}
        </View>
      </View>
      <Pressable onPress={send} disabled={sending || (!content.trim() && !media)} style={[styles.button, (sending || (!content.trim() && !media)) && styles.disabled]}><Text style={styles.buttonText}>{sending ? '…' : 'Envoyer'}</Text></Pressable>
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
