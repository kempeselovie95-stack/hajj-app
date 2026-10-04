import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function GroupChatPage() {
  const { id } = useParams();
  const { api, user } = useAuth();
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
      .catch(() => { if (active) setError('La récupération des messages a échoué.'); });

    Promise.all([api.groups.getById(id), refreshMessages()])
      .then(([groupData]) => { if (active) setGroup(groupData.groupe); })
      .catch(() => { if (active) setError('Groupe introuvable ou accès refusé.'); })
      .finally(() => { if (active) setLoading(false); });
    const interval = window.setInterval(refreshMessages, 5000);
    return () => { active = false; window.clearInterval(interval); };
  }, [api, id]);

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
      setError('Le message n’a pas pu être envoyé. Réessaie.');
    } finally { setSending(false); }
  }

  if (loading) return <p className="text-sm text-slate-500">Chargement de la conversation…</p>;
  if (!group) return <p role="alert" className="text-sm text-red-700">{error || 'Groupe introuvable ou accès refusé.'}</p>;

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-5xl flex-col gap-4">
      <Link to="/encadreur/groupes" className="text-sm text-slate-500 hover:text-emerald-800">← Retour aux groupes</Link>
      <header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Discussion du groupe</p><h1 className="mt-1 text-2xl font-semibold text-slate-900">{group.nom}</h1><p className="mt-1 text-sm text-slate-500">{group.membres.length} pèlerins · Hajj {group.annee_hajj}</p></header>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex min-h-[24rem] flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-5" aria-live="polite">{messages.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">Aucun message. Envoyez la première information au groupe.</p> : messages.map((message) => {
          const mediaUrl = message.media_url;
          return <article key={message.id} className={`max-w-[92%] rounded-xl border p-3 sm:max-w-[78%] ${Number(message.expediteur_id) === Number(user.id) ? 'ml-auto border-emerald-100 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
            <p className="text-xs font-semibold text-slate-500">{message.expediteur_nom}</p>
            {message.contenu && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{message.contenu}</p>}
            {message.media_url && <div className="mt-2">
              {message.media_type?.startsWith('image/') ? <a href={mediaUrl} target="_blank" rel="noreferrer"><img src={mediaUrl} alt={message.media_nom || 'Image partagée dans le groupe'} loading="lazy" className="max-h-72 max-w-full rounded-lg object-contain" /></a>
                : message.media_type?.startsWith('video/') ? <video src={mediaUrl} controls preload="metadata" className="max-h-72 max-w-full rounded-lg" />
                  : message.media_type === 'application/pdf' ? <iframe src={mediaUrl} title={message.media_nom || 'Document PDF partagé'} className="h-72 w-full max-w-xl rounded-lg border border-slate-200" />
                  : <a className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800 underline" href={mediaUrl} target="_blank" rel="noreferrer" download={message.media_nom}>{message.media_nom || 'Ouvrir le document'}</a>}
            </div>}
            <time className="mt-2 block text-[11px] text-slate-400">{new Date(message.cree_le).toLocaleString('fr-FR')}</time>
          </article>;
        })}<div ref={bottomRef} /></div>
        <form onSubmit={sendMessage} className="border-t border-slate-200 pt-4">
          <label htmlFor="group-message" className="sr-only">Message aux pèlerins</label>
          <textarea id="group-message" value={content} onChange={(event) => setContent(event.target.value)} rows={2} placeholder="Écrire un message au groupe…" className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
          {media && <div className="mt-3 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
            {media.type.startsWith('image/') ? <img src={mediaPreview} alt={`Aperçu : ${media.name}`} className="h-20 w-24 rounded-lg border border-emerald-100 bg-white object-contain" />
              : media.type.startsWith('video/') ? <video src={mediaPreview} controls className="h-20 max-w-36 rounded-lg bg-slate-900" />
                : media.type === 'application/pdf' ? <iframe src={mediaPreview} title={`Aperçu : ${media.name}`} className="h-24 w-28 rounded-lg border border-emerald-100 bg-white" />
                  : <div className="flex h-20 w-24 items-center justify-center rounded-lg border border-emerald-100 bg-white text-xs font-semibold text-emerald-800">DOCUMENT</div>}
            <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">Aperçu avant envoi</p><p className="mt-1 truncate text-sm text-slate-700">{media.name}</p><p className="text-xs text-slate-500">{(media.size / (1024 * 1024)).toFixed(2)} Mo</p></div>
            <button type="button" onClick={() => { setMedia(null); if (fileRef.current) fileRef.current.value = ''; }} aria-label="Retirer le média" className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-white hover:text-slate-800">Retirer</button>
          </div>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="cursor-pointer text-sm font-medium text-emerald-800"><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(event) => setMedia(event.target.files?.[0] ?? null)} />{media ? 'Choisir un autre média' : 'Joindre une photo, vidéo ou PDF'}</label><button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50" disabled={sending || (!content.trim() && !media)}>{sending ? 'Envoi…' : 'Envoyer'}</button></div>
        </form>
      </div>
    </section>
  );
}
