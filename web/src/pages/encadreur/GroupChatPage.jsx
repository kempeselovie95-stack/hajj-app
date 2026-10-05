import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

import { useRealtime } from '../../hooks/useRealtime.js';
import { buildCallUrl, isCallActive, isCallMessage } from '@hajj/shared';

export default function GroupChatPage({ groupId, backTo = '/encadreur/groupes' }) {
  const params = useParams();
  const id = groupId ?? params.id;
  const { api, user } = useAuth();
  const { t, formatDateTime, formatNumber } = useLanguage();
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [media, setMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const bottomRef = useRef(null);
  const refreshRef = useRef(() => {});

  useEffect(() => {
    if (!media) {
      setMediaPreview('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(media);
    setMediaPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [media]);

  useEffect(() => {
    let active = true;
    const refreshMessages = () => api.groups.listMessages(id)
      .then((messageData) => { if (active) setMessages(messageData.messages ?? []); })
      .catch(() => { if (active) setError(t('chat_fetchError')); });

    Promise.all([api.groups.getById(id), refreshMessages()])
      .then(([groupData]) => { if (active) setGroup(groupData.groupe); })
      .catch(() => { if (active) setError(t('chat_noAccess')); })
      .finally(() => { if (active) setLoading(false); });
    refreshRef.current = refreshMessages;
    api.groups.markRead(id).catch(() => {});
    const interval = window.setInterval(refreshMessages, 20000); // filet de sécurité : le temps réel ci-dessous fait le gros du travail
    return () => { active = false; window.clearInterval(interval); };
  }, [api, id]);

  useRealtime({ 'group:message': (event) => { if (Number(event.groupe_id) === Number(id)) refreshRef.current(); } }, { groups: [Number(id)] });

  useEffect(() => {
    if (messages.length) api.groups.markRead(id).catch(() => {}); // discussion ouverte = messages lus
  }, [messages.length, api, id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  async function sendMessage(event) {
    event.preventDefault();
    if ((!content.trim() && !media) || sending) return;
    setSending(true);
    const formData = new FormData();
    if (content.trim()) formData.append('contenu', content.trim());
    if (media) formData.append('media', media);
    try {
      await api.groups.sendMessage(id, formData);
      const data = await api.groups.listMessages(id);
      setMessages(data.messages ?? []);
      setContent(''); setMedia(null);
      setError('');
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      setError(t('chat_sendError'));
    } finally { setSending(false); }
  }

  const canCall = ['encadreur', 'agence'].includes(user?.role); // c'est l'encadreur qui choisit audio ou visio
  const fullName = `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim();
  const joinCall = (message) => window.open(buildCallUrl(message.media_url, message.media_type === 'call/audio' ? 'audio' : 'video', fullName), '_blank', 'noopener');
  async function startCall(kind) {
    if (!window.confirm(t('call_confirm'))) return;
    try {
      const result = await api.groups.startCall(id, kind);
      refreshRef.current();
      window.open(buildCallUrl(result.url, kind, fullName), '_blank', 'noopener');
    } catch { setError(t('call_error')); }
  }
  async function endCall() {
    try { await api.groups.endCall(id); refreshRef.current(); } catch { setError(t('call_error')); }
  }

  if (loading) return <p className="text-sm text-slate-500">{t('chat_loading')}</p>;
  if (!group) return <p role="alert" className="text-sm text-red-700">{error || t('chat_noAccess')}</p>;

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-5xl flex-col gap-4">
      <Link to={backTo} className="text-sm text-slate-500 hover:text-emerald-800">{t('chat_back')}</Link>
      <header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">{t('chat_kicker')}</p><h1 className="mt-1 text-2xl font-semibold text-slate-900">{group.nom}</h1><p className="mt-1 text-sm text-slate-500">{t('chat_meta', { count: group.membres.length, year: group.annee_hajj })}</p></header>
      {canCall && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => startCall('audio')} className="rounded-full border border-emerald-700 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50">📞 {t('call_audio')}</button>
          <button type="button" onClick={() => startCall('video')} className="rounded-full border border-emerald-700 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50">🎥 {t('call_video')}</button>
        </div>
      )}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex min-h-[24rem] flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-5" aria-live="polite">{messages.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">{t('chat_empty')}</p> : messages.map((message) => {
          if (isCallMessage(message)) {
            const active = isCallActive(message);
            return <article key={message.id} className={`rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:max-w-[78%] ${active ? '' : 'opacity-60'}`}>
              <p className="font-display text-base font-semibold text-slate-900">{message.media_type === 'call/video' ? '🎥' : message.media_type === 'call/audio' ? '📞' : '📴'} {active ? (message.media_type === 'call/video' ? t('call_videoOngoing') : t('call_audioOngoing')) : t('call_ended')}</p>
              <p className="text-xs text-slate-500">{t('call_by', { name: message.expediteur_nom })} · {formatDateTime(message.cree_le)}</p>
              {active && <div className="mt-2 flex gap-2"><button type="button" onClick={() => joinCall(message)} className="rounded-full bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white">{t('call_join')}</button>{canCall && <button type="button" onClick={endCall} className="rounded-full border border-emerald-700 px-4 py-1.5 text-sm font-medium text-emerald-800">{t('call_end')}</button>}</div>}
            </article>;
          }
          const mediaUrl = message.media_url;
          return <article key={message.id} className={`max-w-[92%] rounded-xl border p-3 sm:max-w-[78%] ${Number(message.expediteur_id) === Number(user.id) ? 'ml-auto border-emerald-100 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
            <p className="text-xs font-semibold text-slate-500">{message.expediteur_nom}</p>
            {message.contenu && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{message.contenu}</p>}
            {message.media_url && <div className="mt-2">
              {message.media_type?.startsWith('image/') ? <a href={mediaUrl} target="_blank" rel="noreferrer"><img src={mediaUrl} alt={message.media_nom || t('chat_imageAlt')} loading="lazy" className="max-h-72 max-w-full rounded-lg object-contain" /></a>
                : message.media_type?.startsWith('video/') ? <video src={mediaUrl} controls preload="metadata" className="max-h-72 max-w-full rounded-lg" />
                  : message.media_type === 'application/pdf' ? <iframe src={mediaUrl} title={message.media_nom || t('chat_pdfTitle')} className="h-72 w-full max-w-xl rounded-lg border border-slate-200" />
                  : <a className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800 underline" href={mediaUrl} target="_blank" rel="noreferrer" download={message.media_nom}>{message.media_nom || t('chat_openDoc')}</a>}
            </div>}
            <time className="mt-2 block text-[11px] text-slate-400">{formatDateTime(message.cree_le)}</time>
          </article>;
        })}<div ref={bottomRef} /></div>
        <form onSubmit={sendMessage} className="border-t border-slate-200 pt-4">
          <label htmlFor="group-message" className="sr-only">{t('chat_messageLabel')}</label>
          <textarea id="group-message" value={content} onChange={(event) => setContent(event.target.value)} rows={2} placeholder={t('chat_placeholder')} className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
          {media && <div className="mt-3 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
            {media.type.startsWith('image/') ? <img src={mediaPreview} alt={t('chat_previewAlt', { name: media.name })} className="h-20 w-24 rounded-lg border border-emerald-100 bg-white object-contain" />
              : media.type.startsWith('video/') ? <video src={mediaPreview} controls className="h-20 max-w-36 rounded-lg bg-slate-900" />
                : media.type === 'application/pdf' ? <iframe src={mediaPreview} title={t('chat_previewAlt', { name: media.name })} className="h-24 w-28 rounded-lg border border-emerald-100 bg-white" />
                  : <div className="flex h-20 w-24 items-center justify-center rounded-lg border border-emerald-100 bg-white text-xs font-semibold text-emerald-800">{t('chat_document')}</div>}
            <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">{t('chat_previewTitle')}</p><p className="mt-1 truncate text-sm text-slate-700">{media.name}</p><p className="text-xs text-slate-500">{formatNumber(media.size / (1024 * 1024), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('c_mb')}</p></div>
            <button type="button" onClick={() => { setMedia(null); if (fileRef.current) fileRef.current.value = ''; }} aria-label={t('chat_removeAria')} className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-white hover:text-slate-800">{t('chat_remove')}</button>
          </div>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="cursor-pointer text-sm font-medium text-emerald-800"><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(event) => setMedia(event.target.files?.[0] ?? null)} />{media ? t('chat_changeMedia') : t('chat_attach')}</label><button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50" disabled={sending || (!content.trim() && !media)}>{sending ? t('chat_sending') : t('chat_send')}</button></div>
        </form>
      </div>
    </section>
  );
}
