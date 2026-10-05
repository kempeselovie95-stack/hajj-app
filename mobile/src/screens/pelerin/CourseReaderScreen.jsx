import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { useLive } from '../../hooks/useLive.js';
import { FONTS } from '../../hooks/useAppFonts.js';
import { createSpeaker, isSpeechSupported, toParagraphs } from '../../utils/speech.js';
import AudioPlayer from '../../ui/AudioPlayer.jsx';
import { Screen, Heading, Card, Pill, Button, Banner, Chips, Empty, Loader } from '../../ui/index.jsx';

const SIZES = [14, 16, 18, 21, 24];
const RATES = [0.8, 1, 1.25, 1.5];

/** Lire le cours (texte, taille réglable, PDF) ou l'écouter (enregistrement audio, ou texte lu à voix haute). */
export default function CourseReaderScreen() {
  const { params } = useRoute();
  const { api, apiBaseUrl } = useAuth();
  const { t, language } = useLanguage();
  const { data: course, loading, error } = useLive(() => api.courses.get(params.courseId), [api, params.courseId]);
  const [tab, setTab] = useState('read');
  const [sizeIndex, setSizeIndex] = useState(1);
  const [rate, setRate] = useState(1);
  const [speaking, setSpeaking] = useState('idle'); // idle | playing | paused
  const [current, setCurrent] = useState(-1);
  const [audioUrl, setAudioUrl] = useState(null);
  const [failure, setFailure] = useState('');
  const speakerRef = useRef(null);

  const paragraphs = useMemo(() => toParagraphs(course?.contenu || course?.description), [course?.contenu, course?.description]);
  const speechOk = isSpeechSupported();

  useEffect(() => {
    speakerRef.current = createSpeaker({ language, onIndex: setCurrent, onEnd: () => setSpeaking('idle') });
    return () => speakerRef.current?.stop(); // on arrête la voix en quittant l'écran
  }, [language]);

  useEffect(() => {
    if (tab !== 'listen' || !course?.a_audio || audioUrl) return;
    api.courses.downloadLink(course.id, { kind: 'audio', inline: true })
      .then((link) => setAudioUrl(`${apiBaseUrl}${link.url}`))
      .catch(() => setFailure(t('rd_audioError')));
  }, [tab, course, api, apiBaseUrl, audioUrl, t]);

  const play = () => { speakerRef.current.play(paragraphs, Math.max(0, current)); setSpeaking('playing'); };
  const pause = () => { speakerRef.current.pause(); setSpeaking('paused'); };
  const resume = () => { speakerRef.current.resume(); setSpeaking('playing'); };
  const stop = () => { speakerRef.current.stop(); setSpeaking('idle'); };
  const changeRate = (value) => { setRate(value); speakerRef.current.setRate(value); };

  async function openPdf() {
    setFailure('');
    try { const link = await api.courses.downloadLink(course.id, { kind: 'file', inline: true }); await Linking.openURL(`${apiBaseUrl}${link.url}`); }
    catch { setFailure(t('co_downloadError')); }
  }

  async function downloadCourse() {
    setFailure('');
    try { const link = await api.courses.downloadLink(course.id, { kind: course.a_fichier ? 'file' : 'text', inline: false }); await Linking.openURL(`${apiBaseUrl}${link.url}`); }
    catch { setFailure(t('co_downloadError')); }
  }

  const fontSize = SIZES[sizeIndex];

  return (
    <Screen>
      {loading ? <Loader /> : error || !course ? <Banner>{t('co_loadError')}</Banner> : (
        <>
          {course.cover_url ? <Image source={{ uri: `${apiBaseUrl}${course.cover_url}` }} style={styles.cover} resizeMode="cover" /> : null}
          <Heading kicker={t(`coursecat_${course.categorie}`)} title={course.titre} subtitle={`${t('co_by', { name: course.encadreur_nom })}${course.nb_pages ? ` · ${t('co_pages', { count: course.nb_pages })}` : ''}`} />
          <Chips value={tab} onChange={(value) => { if (value === 'read') stop(); setTab(value); }} options={[{ value: 'read', label: `📖 ${t('rd_read')}` }, { value: 'listen', label: `🎧 ${t('rd_listen')}` }]} />
          <Banner>{failure}</Banner>

          {tab === 'read' ? (
            <>
              <View style={styles.sizeRow}>
                <Text style={styles.label}>{t('rd_textSize')}</Text>
                <View style={styles.sizeButtons}>
                  <Button small variant="outline" label="A−" disabled={sizeIndex === 0} onPress={() => setSizeIndex((v) => Math.max(0, v - 1))} />
                  <Button small variant="outline" label="A+" disabled={sizeIndex === SIZES.length - 1} onPress={() => setSizeIndex((v) => Math.min(SIZES.length - 1, v + 1))} />
                </View>
              </View>
              {paragraphs.length === 0 ? <Empty>{t('rd_noText')}</Empty> : (
                <Card>{paragraphs.map((paragraph, i) => (
                  <Text key={i} style={[styles.paragraph, { fontSize, lineHeight: Math.round(fontSize * 1.6) }, /^(\d+\.|introduction|conclusion)/i.test(paragraph) && styles.heading]}>{paragraph}</Text>
                ))}</Card>
              )}
              {course.a_fichier ? <Button variant="outline" label={`📄 ${t('rd_openPdf')}`} onPress={openPdf} /> : null}
              {course.inscrit && (course.a_fichier || course.a_contenu) ? <Button variant="outline" label={`⬇  ${t('co_download')}`} onPress={downloadCourse} /> : null}
              {!course.inscrit && (course.a_fichier || course.a_contenu) ? <Text style={styles.meta}>🔒 {t('co_enrollToDownload')}</Text> : null}
            </>
          ) : (
            <>
              {course.a_audio ? (
                <Card>
                  <Text style={styles.cardTitle}>🎧 {t('rd_audioTrack')}</Text>
                  <Text style={styles.meta}>{course.audio_nom}</Text>
                  {audioUrl ? <AudioPlayer url={audioUrl} title={course.titre} /> : <Loader />}
                </Card>
              ) : null}

              {paragraphs.length > 0 ? (
                <Card>
                  <Text style={styles.cardTitle}>🔊 {t('rd_listenText')}</Text>
                  {speechOk ? (
                    <>
                      <Text style={styles.meta}>{t('rd_ttsHint')}</Text>
                      <View style={styles.controls}>
                        {speaking === 'playing' ? <Button label={`⏸  ${t('rd_pause')}`} onPress={pause} style={styles.control} />
                          : speaking === 'paused' ? <Button label={`▶  ${t('rd_play')}`} onPress={resume} style={styles.control} />
                            : <Button label={`▶  ${t('rd_play')}`} onPress={play} style={styles.control} />}
                        <Button variant="outline" label={`⏹  ${t('rd_stop')}`} onPress={stop} disabled={speaking === 'idle'} style={styles.control} />
                      </View>
                      <Text style={styles.label}>{t('rd_speed')}</Text>
                      <Chips value={rate} onChange={changeRate} options={RATES.map((value) => ({ value, label: `×${value}` }))} />
                      <View style={styles.progress}><View style={[styles.progressBar, { width: `${paragraphs.length ? Math.max(0, current + 1) / paragraphs.length * 100 : 0}%` }]} /></View>
                    </>
                  ) : <Banner tone="warning">{t('rd_noSpeech')}</Banner>}
                  {paragraphs.map((paragraph, i) => <Text key={i} style={[styles.paragraph, i === current && styles.active]}>{paragraph}</Text>)}
                </Card>
              ) : !course.a_audio ? <Empty>{t('rd_noAudio')}</Empty> : null}
            </>
          )}
          {course.a_audio && tab === 'read' ? <Pill label={`🎧 ${t('co_hasAudio')}`} tone="info" /> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 170, borderRadius: THEME.radius.lg },
  label: { fontFamily: FONTS.bodyMedium, fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary },
  sizeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sizeButtons: { flexDirection: 'row', gap: 8 },
  paragraph: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.base, color: THEME.colors.textPrimary, paddingVertical: 2 },
  heading: { fontFamily: FONTS.displaySemibold, color: THEME.colors.primary, marginTop: 8 },
  active: { backgroundColor: THEME.colors.successTint, borderRadius: 6, paddingHorizontal: 6 },
  cardTitle: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes.lg, color: THEME.colors.textPrimary },
  meta: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary },
  controls: { flexDirection: 'row', gap: 8 },
  control: { flex: 1 },
  progress: { height: 6, borderRadius: 3, backgroundColor: THEME.colors.surfaceMuted, overflow: 'hidden' },
  progressBar: { height: 6, backgroundColor: THEME.colors.primary },
});
