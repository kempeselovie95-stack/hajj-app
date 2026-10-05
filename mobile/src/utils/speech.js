import { Platform } from 'react-native';

// Lecture à voix haute :
//  - web (Safari/Chrome) : API native `speechSynthesis`, rien à installer ;
//  - iOS/Android : `expo-speech` s'il est installé (`npx expo install expo-speech`), sinon la fonction est signalée indisponible.
// Le `require` en try/catch est une dépendance optionnelle pour Metro : l'app se construit même sans le paquet.
let ExpoSpeech = null;
try { ExpoSpeech = require('expo-speech'); } catch { ExpoSpeech = null; }

const LANGS = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-SA' };

export const isSpeechSupported = () => (Platform.OS === 'web'
  ? typeof window !== 'undefined' && 'speechSynthesis' in window
  : !!ExpoSpeech);

/** Découpe un texte en paragraphes lisibles (lecture phrase par phrase, reprise possible au même endroit). */
export function toParagraphs(text) {
  return String(text || '').split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

/**
 * Lecteur paragraphe par paragraphe : lecture, pause (reprend au paragraphe courant), arrêt, vitesse.
 * @param {{ language: string, onIndex?: (i: number) => void, onEnd?: () => void }} options
 */
export function createSpeaker({ language, onIndex, onEnd }) {
  const lang = LANGS[language] ?? 'fr-FR';
  let paragraphs = [];
  let index = 0;
  let rate = 1;
  let token = 0;
  let state = 'idle';

  const cancel = () => {
    if (Platform.OS === 'web') window.speechSynthesis.cancel();
    else ExpoSpeech?.stop?.();
  };

  const speakCurrent = () => {
    const mine = ++token;
    if (index >= paragraphs.length) { state = 'idle'; index = 0; onIndex?.(-1); onEnd?.(); return; }
    onIndex?.(index);
    const text = paragraphs[index];
    const next = () => { if (mine !== token) return; index += 1; speakCurrent(); };
    if (Platform.OS === 'web') {
      window.speechSynthesis.cancel();
      // Chrome ignore parfois un speak() enchaîné immédiatement après cancel().
      setTimeout(() => {
        if (mine !== token) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang; utterance.rate = rate;
        utterance.onend = next;
        utterance.onerror = (event) => { if (event.error !== 'canceled' && event.error !== 'interrupted') next(); };
        window.speechSynthesis.speak(utterance);
      }, 60);
    } else {
      ExpoSpeech.speak(text, { language: lang, rate, onDone: next, onError: next });
    }
  };

  return {
    play(list, start = 0) { cancel(); paragraphs = list; index = start; state = 'playing'; speakCurrent(); },
    pause() { if (state !== 'playing') return; token += 1; cancel(); state = 'paused'; },
    resume() { if (state === 'paused') { state = 'playing'; speakCurrent(); } },
    stop() { token += 1; cancel(); index = 0; state = 'idle'; onIndex?.(-1); },
    setRate(value) { rate = value; if (state === 'playing') { token += 1; cancel(); speakCurrent(); } },
    get state() { return state; },
  };
}
