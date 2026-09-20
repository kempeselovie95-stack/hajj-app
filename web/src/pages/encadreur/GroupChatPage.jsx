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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    Promise.all([api.groups.getById(id), api.groups.listMessages(id)])
      .then(([groupData, messageData]) => { setGroup(groupData.groupe); setMessages(messageData.messages ?? []); })
      .finally(() => setLoading(false));
  }, [api, id]);

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
      if (fileRef.current) fileRef.current.value = '';
    } finally { setSending(false); }
  }

  if (loading) return <p className="font-body text-text-secondary">Loading chat...</p>;
  if (!group) return <p className="font-body text-danger">Group not found or access denied.</p>;

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-5">
      <Link to="/encadreur/dashboard" className="font-body text-sm text-text-secondary hover:text-primary">← Back to groups</Link>
      <header><p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Group chat</p><h1 className="mt-2 font-display text-3xl font-semibold text-text-primary">{group.nom}</h1><p className="mt-1 text-sm text-text-secondary">{group.membres.length} pilgrims · {group.annee_hajj}</p></header>
      <div className="card flex min-h-[28rem] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto pb-5">{messages.length === 0 ? <p className="py-12 text-center text-sm text-text-secondary">No messages yet. Share the first update with your group.</p> : messages.map((message) => <article key={message.id} className={`max-w-[85%] rounded-lg border p-3 ${message.expediteur_id === user.id ? 'ml-auto border-primary-tint bg-primary-tint' : 'border-border bg-surface-muted'}`}><p className="text-xs font-semibold text-text-secondary">{message.expediteur_nom}</p>{message.contenu && <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">{message.contenu}</p>}{message.media_url && <a className="mt-2 block text-sm font-semibold text-primary underline" href={message.media_url} target="_blank" rel="noreferrer">{message.media_nom || 'Open media'}</a>}<time className="mt-2 block text-[11px] text-text-secondary">{new Date(message.cree_le).toLocaleString()}</time></article>)}</div>
        <form onSubmit={sendMessage} className="border-t border-border pt-4"><textarea value={content} onChange={(event) => setContent(event.target.value)} rows={2} placeholder="Write an update for your pilgrims..." className="input-field resize-none" /><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="cursor-pointer text-sm font-medium text-primary"><input ref={fileRef} type="file" accept="image/*,application/pdf,video/*" className="sr-only" onChange={(event) => setMedia(event.target.files?.[0] ?? null)} />{media ? media.name : 'Attach photo, PDF or video'}</label><button className="btn-primary" disabled={sending}>{sending ? 'Sending...' : 'Send message'}</button></div></form>
      </div>
    </section>
  );
}
