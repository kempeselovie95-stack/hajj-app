/**
 * Données de démonstration des opérations Hajj (voyage, vol, hôtel, chambres,
 * véhicule, transport, programme). Idempotent : ne recrée rien si le voyage
 * de démonstration existe déjà.  Usage : npm run db:seed:operations
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('./config/database');

const TRIP_NAME = 'Hajj 2027 · Départ Douala (démo)';

(async () => {
  try {
    const [groups] = await pool.execute(
      `SELECT g.id, g.agence_id, g.nom FROM groupes_pelerins g WHERE g.annee_hajj=2027 ORDER BY g.id`);
    if (!groups.length) { console.log('Aucun groupe 2027 : lance d’abord npm run db:seed'); return; }
    const agencyId = groups[0].agence_id;
    const agencyGroups = groups.filter((group) => group.agence_id === agencyId);

    const [existing] = await pool.execute('SELECT id FROM voyages WHERE agence_id=? AND nom=?', [agencyId, TRIP_NAME]);
    if (existing.length) { console.log('Données de démonstration déjà présentes.'); return; }

    const [trip] = await pool.execute(
      `INSERT INTO voyages (agence_id, nom, date_depart, date_retour, description, statut) VALUES (?,?,?,?,?, 'PLANNED')`,
      [agencyId, TRIP_NAME, '2027-05-20', '2027-06-25', 'Voyage de démonstration : Douala → Djeddah → Makkah / Médine.']);
    const tripId = trip.insertId;

    const [outbound] = await pool.execute(
      `INSERT INTO vols (voyage_id, numero_vol, compagnie, aeroport_depart, aeroport_arrivee, depart_le, arrivee_le, terminal) VALUES (?,?,?,?,?,?,?,?)`,
      [tripId, 'SV 1181', 'Saudia', 'Douala (DLA)', 'Djeddah (JED)', '2027-05-20 22:30:00', '2027-05-21 06:10:00', 'T1']);
    await pool.execute(
      `INSERT INTO vols (voyage_id, numero_vol, compagnie, aeroport_depart, aeroport_arrivee, depart_le, arrivee_le, terminal) VALUES (?,?,?,?,?,?,?,?)`,
      [tripId, 'SV 1182', 'Saudia', 'Médine (MED)', 'Douala (DLA)', '2027-06-25 01:15:00', '2027-06-25 07:40:00', 'T2']);
    for (const group of agencyGroups) await pool.execute('INSERT IGNORE INTO vol_groupes (vol_id, groupe_id) VALUES (?,?)', [outbound.insertId, group.id]);

    const [hotel] = await pool.execute(
      `INSERT INTO hotels (voyage_id, nom, ville, adresse, telephone, check_in, check_out) VALUES (?,?,?,?,?,?,?)`,
      [tripId, 'Hôtel Dar Al Tawhid', 'Makkah', 'Ibrahim Al Khalil St', '+966125000000', '2027-05-21', '2027-06-10']);
    await pool.execute(
      `INSERT INTO hotels (voyage_id, nom, ville, adresse, telephone, check_in, check_out) VALUES (?,?,?,?,?,?,?)`,
      [tripId, 'Hôtel Anwar Al Madinah', 'Médine', 'King Fahd Rd', '+966148000000', '2027-06-10', '2027-06-24']);
    const roomIds = [];
    for (const [number, capacity] of [['101', 4], ['102', 4], ['103', 3], ['104', 2]]) {
      const [room] = await pool.execute('INSERT INTO chambres (hotel_id, numero, capacite) VALUES (?,?,?)', [hotel.insertId, number, capacity]);
      roomIds.push({ id: room.insertId, capacity });
    }

    // Affecte les premiers pèlerins de l'agence aux chambres de Makkah.
    const [pilgrims] = await pool.execute(
      `SELECT DISTINCT d.pelerin_id FROM dossiers d WHERE d.agence_id=? AND d.statut<>'annule' ORDER BY d.pelerin_id LIMIT 9`, [agencyId]);
    let roomIndex = 0; let seated = 0;
    for (const { pelerin_id: pilgrimId } of pilgrims) {
      if (roomIndex >= roomIds.length) break;
      await pool.execute('INSERT IGNORE INTO chambre_occupants (chambre_id, pelerin_id, hotel_id) VALUES (?,?,?)', [roomIds[roomIndex].id, pilgrimId, hotel.insertId]);
      seated += 1;
      if (seated >= roomIds[roomIndex].capacity) { roomIndex += 1; seated = 0; }
    }

    const [bus] = await pool.execute(
      `INSERT INTO vehicules (agence_id, nom, immatriculation, capacite, chauffeur_nom, chauffeur_telephone) VALUES (?,?,?,?,?,?)`,
      [agencyId, 'Bus 03', 'SA-4521', 50, 'Moussa Al-Harbi', '+966500000003']);
    await pool.execute(
      `INSERT INTO transports (voyage_id, vehicule_id, groupe_id, lieu_depart, destination, depart_le) VALUES (?,?,?,?,?,?)`,
      [tripId, bus.insertId, agencyGroups[0].id, 'Hôtel Dar Al Tawhid', 'Mina', '2027-06-01 08:30:00']);

    const program = [
      ['Départ de Douala', 'FLIGHT', 'Aéroport de Douala', '2027-05-20 22:30:00', null],
      ['Arrivée à l’hôtel de Makkah', 'HOTEL', 'Hôtel Dar Al Tawhid', '2027-05-21 14:00:00', null],
      ['Omra de bienvenue', 'RITUAL', 'Masjid al-Haram', '2027-05-22 06:00:00', null],
      ['Départ vers Mina', 'TRANSPORT', 'Mina', '2027-06-01 08:30:00', agencyGroups[0].id],
      ['Visite de Médine', 'VISIT', 'Médine', '2027-06-12 09:00:00', null],
    ];
    for (const [title, type, place, when, groupId] of program) {
      await pool.execute('INSERT INTO programme_evenements (voyage_id, groupe_id, titre, type, lieu, debut_le) VALUES (?,?,?,?,?,?)', [tripId, groupId, title, type, place, when]);
    }
    console.log(`✅ Opérations de démonstration créées (voyage #${tripId}, agence #${agencyId}).`);
  } catch (error) {
    console.error('❌ Seed opérations :', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
