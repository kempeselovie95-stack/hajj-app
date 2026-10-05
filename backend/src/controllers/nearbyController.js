/** Recherche de lieux à proximité (hôtels…) : lieux de la base + OpenStreetMap (Overpass) quand le réseau le permet. */
const { pool } = require('../config/database');

const cache = new Map(); // clé « lat,lng,rayon » → { at, items }
const CACHE_MS = 10 * 60 * 1000;

const toRad = (deg) => (deg * Math.PI) / 180;
function distanceMeters(lat1, lng1, lat2, lng2) {
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return Math.round(6371000 * 2 * Math.asin(Math.sqrt(a)));
}

async function fromOpenStreetMap(lat, lng, radius) {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)},${radius}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.items;
  const query = `[out:json][timeout:10];(node["tourism"~"^(hotel|guest_house|hostel|apartment)$"](around:${radius},${lat},${lng});way["tourism"~"^(hotel|guest_house|hostel|apartment)$"](around:${radius},${lat},${lng}););out center 40;`;
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'HajjFlow/1.0' },
    body: `data=${encodeURIComponent(query)}`, signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) throw new Error(`overpass ${response.status}`);
  const json = await response.json();
  const items = (json.elements || []).map((element) => {
    const latitude = element.lat ?? element.center?.lat; const longitude = element.lon ?? element.center?.lon;
    const tags = element.tags || {};
    if (latitude == null || longitude == null || !tags.name) return null;
    const address = [tags['addr:street'], tags['addr:city']].filter(Boolean).join(', ');
    return { id: `osm-${element.type}-${element.id}`, nom: tags.name, type: 'HOTEL', latitude, longitude, adresse: address || null, etoiles: tags.stars ? Number(tags.stars) || null : null, telephone: tags.phone || tags['contact:phone'] || null, site: tags.website || tags['contact:website'] || null, source: 'osm' };
  }).filter(Boolean);
  cache.set(key, { at: Date.now(), items });
  return items;
}

const nearby = async (req, res, next) => {
  try {
    const lat = Number(req.query.lat); const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return res.status(400).json({ succes: false, message: 'Position invalide.' });
    const radius = Math.min(20000, Math.max(300, Number(req.query.radius) || 3000));
    const type = ['HOTEL', 'HOLY_SITE', 'MEETING', 'HOSPITAL', 'AIRPORT', 'OTHER'].includes(req.query.type) ? req.query.type : 'HOTEL';

    // Lieux enregistrés (communs + agences du pèlerin, mêmes règles que la liste des lieux)
    const user = req.utilisateur;
    let scope = 'agence_id IS NULL'; const params = [type];
    if (user.role === 'pelerin') { scope = 'agence_id IS NULL OR agence_id IN (SELECT agence_id FROM dossiers WHERE pelerin_id=? AND agence_id IS NOT NULL)'; params.push(user.id); }
    else if (user.role === 'encadreur') { scope = 'agence_id IS NULL OR agence_id IN (SELECT agence_id FROM encadreurs WHERE utilisateur_id=?)'; params.push(user.id); }
    else if (user.role === 'agence') { scope = 'agence_id IS NULL OR agence_id IN (SELECT id FROM agences WHERE utilisateur_id=?)'; params.push(user.id); }
    else if (user.role === 'admin') scope = '1=1';
    const [rows] = await pool.execute(`SELECT id, nom, type, CAST(latitude AS DOUBLE) AS latitude, CAST(longitude AS DOUBLE) AS longitude, adresse, description FROM lieux WHERE type=? AND (${scope})`, params);
    const items = rows.map((row) => ({ ...row, source: 'agence' }));

    let osmAvailable = true;
    if (type === 'HOTEL') {
      try { items.push(...(await fromOpenStreetMap(lat, lng, radius))); } catch { osmAvailable = false; }
    }
    const result = items
      .map((item) => ({ ...item, distance_m: distanceMeters(lat, lng, item.latitude, item.longitude) }))
      .filter((item) => item.distance_m <= radius)
      .sort((a, b) => a.distance_m - b.distance_m)
      .slice(0, 50);
    res.json({ succes: true, items: result, rayon_m: radius, osm: osmAvailable });
  } catch (error) { next(error); }
};

module.exports = { nearby, distanceMeters };
