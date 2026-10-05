import { createElement, useEffect, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, Text } from 'react-native';
import { THEME } from '@hajj/shared';
import { FONTS } from '../hooks/useAppFonts.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { Button } from './index.jsx';

// expo-av est optionnel (`npx expo install expo-av`) : sans lui, l'audio s'ouvre dans le lecteur du téléphone.
let ExpoAv = null;
try { ExpoAv = require('expo-av'); } catch { ExpoAv = null; }

/** Lecteur audio : élément <audio> sur le web, expo-av sur mobile (si installé), sinon ouverture externe. */
export default function AudioPlayer({ url, title }) {
  const { t } = useLanguage();
  const soundRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => () => { soundRef.current?.unloadAsync?.(); }, []);

  if (Platform.OS === 'web') {
    return createElement('audio', { src: url, controls: true, preload: 'metadata', style: { width: '100%' }, 'aria-label': title, onError: () => setError(true) });
  }

  async function toggle() {
    try {
      if (!soundRef.current) {
        const { sound } = await ExpoAv.Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => { if (status.didJustFinish) setPlaying(false); });
        setPlaying(true);
      } else if (playing) { await soundRef.current.pauseAsync(); setPlaying(false); }
      else { await soundRef.current.playAsync(); setPlaying(true); }
    } catch { setError(true); }
  }

  return (
    <>
      {ExpoAv
        ? <Button label={playing ? `⏸  ${t('rd_pause')}` : `▶  ${t('rd_play')}`} onPress={toggle} />
        : <Button label={`▶  ${t('rd_play')}`} onPress={() => Linking.openURL(url)} />}
      {error ? <Text style={styles.error}>{t('rd_audioError')}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.xs, color: THEME.colors.danger },
});
