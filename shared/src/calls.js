/**
 * Appels audio / visio de groupe (Jitsi Meet). L'encadreur lance l'appel dans la discussion du groupe,
 * les pèlerins le rejoignent d'un toucher. Aucune clé d'API : salle Jitsi à nom imprévisible.
 */
export const isCallMessage = (message) => String(message?.media_type || '').startsWith('call/');
export const isCallActive = (message) => message?.media_type === 'call/audio' || message?.media_type === 'call/video';

/** URL de la salle, configurée pour l'audio seul ou la visio, avec le nom affiché de l'utilisateur. */
export function buildCallUrl(roomUrl, kind, displayName = '') {
  const params = [
    'config.prejoinPageEnabled=false',
    'config.disableDeepLinking=true',
    `userInfo.displayName=${encodeURIComponent(JSON.stringify(displayName))}`,
  ];
  if (kind === 'audio') params.push('config.startAudioOnly=true', 'config.startWithVideoMuted=true');
  return `${roomUrl}#${params.join('&')}`;
}
