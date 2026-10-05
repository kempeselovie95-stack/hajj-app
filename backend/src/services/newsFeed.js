/**
 * Importe automatiquement des actualités du pèlerinage depuis des flux RSS (Google Actualités par défaut)
 * et les diffuse en temps réel aux applications connectées. Sans réseau, l'import échoue sans bruit.
 */
const { pool } = require('../config/database');
const realtime = require('./realtime');

const DEFAULT_FEEDS = [
  'https://news.google.com/rss/search?q=hajj+p%C3%A8lerinage&hl=fr&gl=FR&ceid=FR:fr',
  'https://news.google.com/rss/search?q=hajj+umrah&hl=en&gl=US&ceid=US:en',
];
const MAX_PER_FEED = 8;

const decode = (text) => String(text || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const stripHtml = (html) => decode(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (block, name) => { const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i')); return match ? decode(match[1]).trim() : ''; };
const attr = (block, name, attribute) => { const match = block.match(new RegExp(`<${name}\\s[^>]*${attribute}="([^"]+)"`, 'i')); return match ? decode(match[1]) : ''; };

function categorize(text) {
  if (/sant[eé]|health|vaccin|m[eé]ning|covid|chaleur|heat/i.test(text)) return 'HEALTH';
  if (/\bvols?\b|flight|visa|voyage|travel|a[eé]roport|airport|quota/i.test(text)) return 'TRAVEL';
  return 'NEWS';
}

function parseRss(xml) {
  return [...String(xml).matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(([, block]) => {
    const title = stripHtml(tag(block, 'title'));
    const link = tag(block, 'link');
    const source = tag(block, 'source');
    let description = stripHtml(tag(block, 'description'));
    if (source && description.endsWith(source)) description = description.slice(0, -source.length).trim();
    if (description === title) description = '';
    const image = attr(block, 'enclosure', 'url') || attr(block, 'media:content', 'url') || attr(block, 'media:thumbnail', 'url');
    const date = new Date(tag(block, 'pubDate'));
    return { title, link, source, description, image: /^https:\/\//.test(image) ? image : '', date: Number.isNaN(date.getTime()) ? new Date() : date };
  }).filter((item) => item.title && /^https?:\/\//.test(item.link));
}

async function importFeeds() {
  const [admins] = await pool.execute("SELECT id FROM utilisateurs WHERE role='admin' AND est_actif=TRUE ORDER BY id LIMIT 1");
  if (!admins.length) return 0;
  const feeds = (process.env.NEWS_FEEDS ? process.env.NEWS_FEEDS.split(',') : DEFAULT_FEEDS).map((url) => url.trim()).filter(Boolean);
  let added = 0;
  for (const url of feeds) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'HajjFlow/1.0' } });
      if (!response.ok) continue;
      for (const item of parseRss(await response.text()).slice(0, MAX_PER_FEED)) {
        const [known] = await pool.execute('SELECT 1 FROM actualites WHERE source_url=? LIMIT 1', [item.link.slice(0, 500)]);
        if (known.length) continue;
        await pool.execute(
          `INSERT INTO actualites (auteur_id, agence_id, titre, contenu, categorie, media_type, image_url, statut, source_url, source_nom, cree_le)
           VALUES (?, NULL, ?, ?, ?, ?, ?, 'PUBLISHED', ?, ?, ?)`,
          [admins[0].id, item.title.slice(0, 200), item.description.slice(0, 1500) || null, categorize(`${item.title} ${item.description}`), item.image ? 'IMAGE' : 'NONE', item.image || null, item.link.slice(0, 500), item.source.slice(0, 120) || null, item.date]);
        added += 1;
      }
    } catch { /* réseau indisponible : on réessaiera au prochain passage */ }
  }
  if (added) realtime.broadcast('news', { action: 'imported', count: added });
  return added;
}

function start() {
  if (process.env.NEWS_FEED === 'off') return;
  const run = () => importFeeds().then((count) => { if (count) console.log(`[news] ${count} actualité(s) importée(s)`); }).catch(() => {});
  setTimeout(run, 15000).unref();
  setInterval(run, Math.max(5, Number(process.env.NEWS_FEED_MINUTES || 30)) * 60000).unref();
}

module.exports = { start, importFeeds, parseRss };
