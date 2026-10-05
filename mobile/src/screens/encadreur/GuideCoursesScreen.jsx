import { useState } from 'react';
import { Alert, Image, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useConfirm } from '../../ui/ConfirmContext.jsx';
import { THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { useLive } from '../../hooks/useLive.js';
import { FONTS } from '../../hooks/useAppFonts.js';
import { toFormFile, fallbackName } from '../../utils/filePart.js';
import { Screen, Heading, Card, Pill, Button, Banner, Chips, Field, Empty, Loader, StatCard } from '../../ui/index.jsx';

const CATEGORIES = ['RITUALS', 'HEALTH', 'LANGUAGE', 'LOGISTICS', 'OTHER'];
const STATUS_TONE = { DRAFT: 'neutral', PUBLISHED: 'success', CANCELLED: 'danger' };
const EMPTY = { id: null, nb_pages: '', cover: null, pdf: null, cover_url: null, fichier_nom: null, contenu: '', audio: null, audio_nom: null, titre: '', categorie: 'RITUALS', date: '', heure: '', duree_minutes: '60', lieu: '', lien_visio: '', support_url: '', groupe_id: null, statut: 'PUBLISHED', description: '' };

/** Le guide gère ses cours : création, modification, publication, annulation, suppression, inscrits. */
export default function GuideCoursesScreen() {
  const { api, apiBaseUrl } = useAuth();
  const confirm = useConfirm();
  const { t, formatDateTime } = useLanguage();
  const { data, loading, error, reload } = useLive(async () => {
    const [courses, groups] = await Promise.all([api.courses.list(), api.groups.list().then((response) => response.groupes ?? [])]);
    return { courses, groups };
  }, [api]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ tone: 'danger', text: '' });
  const [people, setPeople] = useState(null);

  const courses = data?.courses ?? [];
  const groups = data?.groups ?? [];
  const upcoming = courses.filter((course) => course.statut === 'PUBLISHED' && course.debut_le >= new Date().toISOString().slice(0, 16));

  function openForm(course) {
    setMessage({ tone: 'danger', text: '' });
    setForm(course ? {
      id: course.id, titre: course.titre, categorie: course.categorie, date: course.debut_le.slice(0, 10), heure: course.debut_le.slice(11, 16),
      duree_minutes: String(course.duree_minutes), lieu: course.lieu || '', lien_visio: course.lien_visio || '', support_url: course.support_url || '',
      groupe_id: course.groupe_id, statut: course.statut === 'CANCELLED' ? 'PUBLISHED' : course.statut, description: course.description || '',
      nb_pages: course.nb_pages ? String(course.nb_pages) : '', cover: null, pdf: null, cover_url: course.cover_url, fichier_nom: course.fichier_nom,
      contenu: '', audio: null, audio_nom: course.audio_nom, contenuLoaded: false,
    } : EMPTY);
    // Le texte complet n'est pas dans la liste : on le charge pour pouvoir le modifier.
    if (course?.a_contenu) api.courses.get(course.id).then((full) => setForm((current) => (current && current.id === course.id ? { ...current, contenu: full.contenu || '', contenuLoaded: true } : current))).catch(() => {});
  }

  async function save() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || !/^\d{2}:\d{2}$/.test(form.heure)) { setMessage({ tone: 'danger', text: t('mob_invalidDate') }); return; }
    setSaving(true); setMessage({ tone: 'danger', text: '' });
    try {
      const body = new FormData();
      const fields = {
        titre: form.titre, categorie: form.categorie, debut_le: `${form.date}T${form.heure}`, duree_minutes: form.duree_minutes || '60', lieu: form.lieu, lien_visio: form.lien_visio,
        support_url: form.support_url, groupe_id: form.groupe_id ?? '', statut: form.statut, description: form.description, nb_pages: form.nb_pages,
      };
      if (!form.id || form.contenuLoaded || form.contenu) fields.contenu = form.contenu;
      for (const [key, value] of Object.entries(fields)) body.append(key, String(value ?? ''));
      if (form.cover) body.append('cover', await toFormFile(form.cover));
      if (form.pdf) body.append('file', await toFormFile(form.pdf));
      if (form.audio) body.append('audio', await toFormFile(form.audio));
      if (form.id) await api.courses.update(form.id, body); else await api.courses.create(body);
      setForm(null); reload();
    } catch (requestError) { setMessage({ tone: 'danger', text: requestError.message || t('res_saveError') }); }
    finally { setSaving(false); }
  }

  async function pickCover() {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert(t('mob_permissionDenied'), t('mob_galleryPermission')); return; }
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, aspect: [16, 9] });
    if (result.canceled) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    setForm((current) => ({ ...current, cover: { uri: asset.uri, name: asset.fileName || fallbackName('cover', mimeType), mimeType } }));
  }

  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    setForm((current) => ({ ...current, pdf: { uri: asset.uri, name: asset.name || 'cours.pdf', mimeType: 'application/pdf' } }));
  }

  async function pickAudio() {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    setForm((current) => ({ ...current, audio: { uri: asset.uri, name: asset.name || 'cours.mp3', mimeType: asset.mimeType || 'audio/mpeg' } }));
  }

  async function act(action) {
    try { await action(); reload(); } catch (requestError) { setMessage({ tone: 'danger', text: requestError.message || t('res_saveError') }); }
  }

  const confirmDelete = async (course) => { if (await confirm({ title: t('c_delete'), message: t('res_confirmDelete'), confirmLabel: t('c_delete'), danger: true })) act(() => api.courses.remove(course.id)); };

  return (
    <Screen>
      <Heading kicker={t('co_kicker')} title={t('courses')} subtitle={t('co_subtitleGuide')} />
      <Banner tone={message.tone}>{!form ? message.text : ''}</Banner>
      <Button label={t('co_new')} onPress={() => openForm(null)} />
      <View style={styles.grid}>
        <StatCard label={t('co_total')} value={courses.length} />
        <StatCard label={t('co_upcoming')} value={upcoming.length} tone="success" />
      </View>
      {error && !data ? <Banner>{t('co_loadError')}</Banner> : null}
      {loading ? <Loader /> : courses.length === 0 ? <Empty>{t('co_none')}</Empty> : courses.map((course) => (
        <Card key={course.id}>
          {course.cover_url ? <Image source={{ uri: `${apiBaseUrl}${course.cover_url}` }} style={styles.cover} resizeMode="cover" /> : null}
          <View style={styles.rowBetween}>
            <Pill label={t(`coursecat_${course.categorie}`)} tone="info" />
            <Pill label={t(`coursestatus_${course.statut}`)} tone={STATUS_TONE[course.statut]} />
          </View>
          <Text style={styles.title}>{course.titre}</Text>
          <Text style={styles.meta}>{formatDateTime(course.debut_le)} · {t('co_minutes', { count: course.duree_minutes })}{course.nb_pages ? ` · ${t('co_pages', { count: course.nb_pages })}` : ''}{course.a_fichier ? ' · PDF' : ''}</Text>
          <Text style={styles.meta}>{course.groupe_nom || t('co_allPilgrims')}{course.lieu ? ` · 📍 ${course.lieu}` : course.lien_visio ? ` · ${t('co_online')}` : ''}</Text>
          <Text style={styles.link} onPress={async () => { try { setPeople({ course, list: await api.courses.participants(course.id) }); } catch { /* ignoré */ } }}>{t('co_enrolled')} : {course.inscrits}</Text>
          <View style={styles.actions}>
            <Button small variant="outline" label={t('c_edit')} onPress={() => openForm(course)} style={styles.action} />
            {course.statut === 'PUBLISHED' ? <Button small variant="ghost" label={t('co_cancel')} onPress={() => act(() => api.courses.update(course.id, { statut: 'CANCELLED' }))} style={styles.action} /> : null}
            {course.statut === 'DRAFT' ? <Button small label={t('co_publish')} onPress={() => act(() => api.courses.update(course.id, { statut: 'PUBLISHED' }))} style={styles.action} /> : null}
            <Button small variant="danger" label={t('c_delete')} onPress={() => confirmDelete(course)} style={styles.action} />
          </View>
        </Card>
      ))}

      <Modal visible={!!form} animationType="slide" onRequestClose={() => setForm(null)}>
        {form ? (
          <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.cardTitle}>{form.id ? t('c_edit') : t('co_new')}</Text>
            <Banner tone={message.tone}>{message.text}</Banner>
            <Field label={t('co_title')} value={form.titre} onChangeText={(value) => setForm((c) => ({ ...c, titre: value }))} maxLength={200} />
            <Text style={styles.label}>{t('co_category')}</Text>
            <Chips value={form.categorie} onChange={(value) => setForm((c) => ({ ...c, categorie: value }))} options={CATEGORIES.map((value) => ({ value, label: t(`coursecat_${value}`) }))} />
            <Field label={t('mob_dateField')} value={form.date} onChangeText={(value) => setForm((c) => ({ ...c, date: value }))} placeholder="2027-05-10" keyboardType="numbers-and-punctuation" maxLength={10} />
            <Field label={t('mob_timeField')} value={form.heure} onChangeText={(value) => setForm((c) => ({ ...c, heure: value }))} placeholder="09:00" keyboardType="numbers-and-punctuation" maxLength={5} />
            <Field label={t('co_duration')} value={form.duree_minutes} onChangeText={(value) => setForm((c) => ({ ...c, duree_minutes: value.replace(/\D/g, '') }))} keyboardType="number-pad" maxLength={3} />
            <Field label={t('pg2_place')} value={form.lieu} onChangeText={(value) => setForm((c) => ({ ...c, lieu: value }))} maxLength={200} />
            <Field label={t('co_link')} value={form.lien_visio} onChangeText={(value) => setForm((c) => ({ ...c, lien_visio: value }))} autoCapitalize="none" keyboardType="url" />
            <Field label={t('co_material')} value={form.support_url} onChangeText={(value) => setForm((c) => ({ ...c, support_url: value }))} autoCapitalize="none" keyboardType="url" />
            <Field label={t('co_pagesField')} value={form.nb_pages} onChangeText={(value) => setForm((c) => ({ ...c, nb_pages: value.replace(/\D/g, '') }))} keyboardType="number-pad" maxLength={4} placeholder={t('co_pagesAuto')} />
            <Text style={styles.label}>{t('co_cover')}</Text>
            {form.cover ? <Image source={{ uri: form.cover.uri }} style={styles.coverPreview} resizeMode="cover" /> : form.cover_url ? <Image source={{ uri: `${apiBaseUrl}${form.cover_url}` }} style={styles.coverPreview} resizeMode="cover" /> : null}
            <Button variant="outline" small label={form.cover || form.cover_url ? t('mob_replace') : t('mob_add')} onPress={pickCover} />
            <Text style={styles.label}>{t('co_file')}</Text>
            <Text style={styles.meta}>{form.pdf ? form.pdf.name : form.fichier_nom || t('co_fileHint')}</Text>
            <Button variant="outline" small label={form.pdf || form.fichier_nom ? t('mob_replace') : t('mob_add')} onPress={pickPdf} />
            <Field label={t('co_content')} value={form.contenu} onChangeText={(value) => setForm((c) => ({ ...c, contenu: value }))} multiline maxLength={60000} hint={t('co_contentHint')} style={{ minHeight: 140 }} />
            <Text style={styles.label}>{t('co_audio')}</Text>
            <Text style={styles.meta}>{form.audio ? form.audio.name : form.audio_nom || '—'}</Text>
            <Button variant="outline" small label={form.audio || form.audio_nom ? t('mob_replace') : t('mob_add')} onPress={pickAudio} />
            <Text style={styles.label}>{t('co_audience')}</Text>
            <Chips scroll value={form.groupe_id} onChange={(value) => setForm((c) => ({ ...c, groupe_id: value }))} options={[{ value: null, label: t('co_allPilgrims') }, ...groups.map((group) => ({ value: group.id, label: group.nom }))]} />
            <Text style={styles.label}>{t('c_status')}</Text>
            <Chips value={form.statut} onChange={(value) => setForm((c) => ({ ...c, statut: value }))} options={['PUBLISHED', 'DRAFT'].map((value) => ({ value, label: t(`coursestatus_${value}`) }))} />
            <Field label={t('op_description')} value={form.description} onChangeText={(value) => setForm((c) => ({ ...c, description: value }))} multiline maxLength={4000} />
            <Button label={t('c_save')} loading={saving} disabled={!form.titre.trim() || !form.date || !form.heure} onPress={save} />
            <Button variant="ghost" label={t('cancel')} onPress={() => setForm(null)} />
          </ScrollView>
        ) : null}
      </Modal>

      <Modal visible={!!people} animationType="fade" transparent onRequestClose={() => setPeople(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.cardTitle}>{people?.course.titre}</Text>
            {people && people.list.length === 0 ? <Text style={styles.meta}>{t('co_noParticipants')}</Text> : people?.list.map((person) => <Text key={person.id} style={styles.body}>{person.prenom} {person.nom}{person.telephone ? ` · ${person.telephone}` : ''}</Text>)}
            <Button variant="ghost" label={t('c_close')} onPress={() => setPeople(null)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: THEME.spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  action: { flexGrow: 1 },
  cover: { width: '100%', height: 120, borderRadius: THEME.radius.md },
  coverPreview: { width: '100%', height: 130, borderRadius: THEME.radius.md },
  title: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes.lg, color: THEME.colors.textPrimary },
  meta: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary },
  body: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.sm, color: THEME.colors.textPrimary },
  link: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.sm, color: THEME.colors.primary, textDecorationLine: 'underline' },
  cardTitle: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes.lg, color: THEME.colors.textPrimary },
  label: { fontFamily: FONTS.bodyMedium, fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary },
  modal: { flex: 1, backgroundColor: THEME.colors.background },
  modalContent: { padding: THEME.spacing.lg, gap: THEME.spacing.sm, paddingTop: THEME.spacing['2xl'], paddingBottom: THEME.spacing['2xl'] },
  overlay: { flex: 1, backgroundColor: 'rgba(22,36,31,0.4)', justifyContent: 'center', padding: THEME.spacing.lg },
  sheet: { backgroundColor: THEME.colors.surface, borderRadius: THEME.radius.lg, padding: THEME.spacing.lg, gap: 8 },
});
