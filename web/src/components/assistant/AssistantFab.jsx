import { useEffect, useRef, useState } from 'react';
import { assistantReply, assistantStrings } from '@hajj/shared';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

/** Bouton flottant « Assistant IA » (démo) : discussion aux réponses simulées, en bas à droite. */
export default function AssistantFab() {
  const { language, dir } = useLanguage();
  const kb = assistantStrings(language);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const bottom = useRef(null);

  useEffect(() => { setMessages([{ from: 'bot', text: kb.welcome }]); }, [language]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [messages, typing, open]);

  function ask(question) {
    const value = (question ?? text).trim();
    if (!value || typing) return;
    setText('');
    setMessages((current) => [...current, { from: 'me', text: value }]);
    setTyping(true);
    window.setTimeout(() => { setMessages((current) => [...current, { from: 'bot', text: assistantReply(language, value) }]); setTyping(false); }, 650);
  }

  return (
    <div className="fixed bottom-4 end-4 z-[70]" dir={dir}>
      {open ? (
        <section className="flex h-[min(34rem,calc(100dvh-6rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" aria-label={kb.title}>
          <header className="flex items-center gap-2 bg-emerald-800 px-4 py-3 text-white">
            <span aria-hidden="true" className="text-xl">🤖</span>
            <h2 className="flex-1 text-sm font-semibold">{kb.title}</h2>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-wider">{kb.demo}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-2xl leading-none">×</button>
          </header>
          <div className="flex-1 space-y-2 overflow-y-auto p-3" aria-live="polite">
            {messages.map((message, index) => (
              <p key={index} className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${message.from === 'me' ? 'ms-auto bg-emerald-700 text-white' : 'bg-slate-100 text-slate-800'}`}>{message.text}</p>
            ))}
            {typing && <p className="max-w-[88%] rounded-2xl bg-slate-100 px-3 py-2 text-sm italic text-slate-500">{kb.thinking}</p>}
            {messages.length <= 1 && <div className="flex flex-col items-start gap-2 pt-1">{kb.suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => ask(suggestion)} className="rounded-full border border-emerald-700 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50">{suggestion}</button>)}</div>}
            <div ref={bottom} />
          </div>
          <form onSubmit={(event) => { event.preventDefault(); ask(); }} className="flex gap-2 border-t border-slate-200 p-3">
            <input value={text} onChange={(event) => setText(event.target.value)} placeholder={kb.placeholder} aria-label={kb.placeholder} className="min-w-0 flex-1 rounded-full border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700" />
            <button type="submit" disabled={!text.trim() || typing} className="rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{kb.send}</button>
          </form>
        </section>
      ) : (
        <button type="button" onClick={() => setOpen(true)} aria-label={kb.title} title={kb.title} className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-800 text-2xl text-white shadow-xl transition hover:scale-105 hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">🤖</button>
      )}
    </div>
  );
}
