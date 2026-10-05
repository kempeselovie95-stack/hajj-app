import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { useLive } from '../../hooks/useLive.js';
import { FONTS } from '../../hooks/useAppFonts.js';
import { Screen, Heading, Card, Pill, Button, Banner, Chips, Field, Empty, Loader } from '../../ui/index.jsx';

const TABS = ['attendance', 'scan', 'incidents'];
const PURPOSES = ['CONTROL', 'PRESENCE', 'BOARDING', 'TRANSPORT', 'ARRIVAL', 'ASSISTANCE'];
const CATEGORIES = ['MEDICAL', 'LOST_PERSON', 'TRANSPORT', 'DOCUMENT', 'ACCOMMODATION', 'SECURITY', 'OTHER'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const ATT_TONE = { PRESENT: 'success', ABSENT: 'danger', TO_CHECK: 'warning', PENDING: 'neutral' };
const PRIO_TONE = { LOW: 'neutral', MEDIUM: 'info', HIGH: 'warning', URGENT: 'danger' };

/** Terrain : appel du groupe, scan de QR Code et signalement d'incidents. */
export default function PresenceScreen() {
  const { api } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState('attendance');
  const [groupId, setGroupId] = useState(null);
  const groupsLive = useLive(async () => {
    const list = (await api.groups.list()).groupes ?? [];
    setGroupId((current) => current ?? (list[0] ? list[0].id : null));
    return list;
  }, [api]);
  const groups = groupsLive.data ?? [];

  return (
    <Screen>
      <Heading kicker={t('pr_kicker')} title={t('presence')} subtitle={t('pr_subtitle')} />
      <Chips value={tab} onChange={setTab} options={TABS.map((name) => ({ value: name, label: t(`pr_tab_${name}`) }))} />
      {tab === 'attendance' ? <AttendanceTab groups={groups} groupId={groupId} setGroupId={setGroupId} /> : null}
      {tab === 'scan' ? <ScanTab /> : null}
      {tab === 'incidents' ? <IncidentsTab groups={groups} /> : null}
    </Screen>
  );
}

function AttendanceTab({ groups, groupId, setGroupId }) {
  const { api } = useAuth();
  const { t } = useLanguage();
  const { data, loading, error, reload } = useLive(() => (groupId ? api.operations.attendance.group(groupId) : Promise.resolve(null)), [api, groupId]);
  const [failed, setFailed] = useState(false);

  async function mark(member, type) {
    setFailed(false);
    try { await api.operations.attendance.record({ groupe_id: Number(groupId), pelerin_id: member.id, type_evenement: type }); reload(); }
    catch { setFailed(true); }
  }

  const counters = data?.compteurs ?? { PRESENT: 0, ABSENT: 0, TO_CHECK: 0, PENDING: 0 };
  if (!groups.length) return <Empty>{t('pr_noGroups')}</Empty>;
  return (
    <>
      <Chips scroll value={groupId} onChange={setGroupId} options={groups.map((group) => ({ value: group.id, label: group.nom }))} />
      <View style={styles.counters}>{['PRESENT', 'TO_CHECK', 'ABSENT', 'PENDING'].map((key) => <Pill key={key} tone={ATT_TONE[key]} label={`${t(`att_${key}`)} : ${counters[key]}`} />)}</View>
      {error && !data ? <Banner>{t('pr_loadError')}</Banner> : null}
      {failed ? <Banner>{t('pr_markError')}</Banner> : null}
      {loading ? <Loader /> : !data?.membres?.length ? <Empty>{t('gr_noMembers')}</Empty> : data.membres.map((member) => (
        <Card key={member.id}>
          <View style={styles.rowBetween}>
            <View style={styles.flex1}><Text style={styles.name}>{member.prenom} {member.nom}</Text><Text style={styles.meta}>{member.telephone || '—'}</Text></View>
            <Pill tone={ATT_TONE[member.statut || 'PENDING']} label={t(`att_${member.statut || 'PENDING'}`)} />
          </View>
          <View style={styles.actions}>
            <Button small label={`✓ ${t('att_PRESENT')}`} onPress={() => mark(member, 'PRESENT')} style={styles.action} />
            <Button small variant="outline" label={`! ${t('att_TO_CHECK')}`} onPress={() => mark(member, 'TO_CHECK')} style={styles.action} />
            <Button small variant="danger" label={`✕ ${t('att_ABSENT')}`} onPress={() => mark(member, 'ABSENT')} style={styles.action} />
          </View>
        </Card>
      ))}
    </>
  );
}

function ScanTab() {
  const { api } = useAuth();
  const { t } = useLanguage();
  const [token, setToken] = useState('');
  const [purpose, setPurpose] = useState('PRESENCE');
  const [place, setPlace] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function scan() {
    setBusy(true); setError(''); setResult(null);
    try { setResult(await api.operations.qr.scan(token.trim(), purpose, place || undefined)); setToken(''); }
    catch (requestError) { setError(requestError.status === 404 ? t('qr_unknown') : requestError.status === 400 ? t('qr_invalid') : t('qr_scanError')); }
    finally { setBusy(false); }
  }

  return (
    <>
      <Card>
        <Text style={styles.cardTitle}>{t('qr_scanTitle')}</Text>
        <Text style={styles.meta}>{t('mob_noCamera')}</Text>
        <Chips scroll value={purpose} onChange={setPurpose} options={PURPOSES.map((value) => ({ value, label: t(`scan_${value}`) }))} />
        <Field label={t('qr_place')} value={place} onChangeText={setPlace} maxLength={150} />
        <Field label={t('qr_token')} value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} placeholder={t('qr_tokenHint')} />
        <Button label={t('qr_validate')} onPress={scan} loading={busy} disabled={!token.trim()} />
      </Card>
      <Banner>{error}</Banner>
      {result ? (
        <Card>
          <Text style={styles.cardTitle}>{t('qr_result')}</Text>
          <Text style={styles.big}>{result.pelerin.prenom} {result.pelerin.nom}</Text>
          <Text style={styles.mono}>{result.pelerin.code}</Text>
          <Text style={styles.meta}>{t('gr_colGroup')} : {result.groupe ? `${result.groupe.nom} · ${result.groupe.code}` : '—'}</Text>
          <Text style={styles.meta}>{t('gr_colGuide')} : {result.groupe?.guide || '—'}</Text>
          <Text style={styles.meta}>{t('c_status')} : {t(`status_${result.pelerin.statut}`)}</Text>
          <Banner tone={result.presence_enregistree ? 'success' : 'neutral'}>{result.presence_enregistree ? t('qr_recorded', { purpose: t(`scan_${result.motif}`) }) : t('qr_loggedOnly')}</Banner>
        </Card>
      ) : null}
    </>
  );
}

function IncidentsTab({ groups }) {
  const { api } = useAuth();
  const { t, formatDateTime } = useLanguage();
  const { data, loading, error, reload } = useLive(() => api.operations.incidents.list(), [api]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ groupe_id: null, pelerin_id: null, categorie: 'MEDICAL', priorite: 'MEDIUM', description: '' });
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const members = useLive(() => (open && form.groupe_id ? api.operations.attendance.group(form.groupe_id).then((response) => response.membres) : Promise.resolve([])), [api, open, form.groupe_id]).data ?? [];

  async function submit() {
    setSaving(true); setFailed(false);
    try { await api.operations.incidents.create({ ...form, pelerin_id: form.pelerin_id || undefined }); setOpen(false); setForm((current) => ({ ...current, pelerin_id: null, description: '' })); reload(); }
    catch { setFailed(true); } finally { setSaving(false); }
  }

  return (
    <>
      <Button variant="danger" label={t('inc_report')} disabled={!groups.length} onPress={() => { setForm((current) => ({ ...current, groupe_id: current.groupe_id ?? groups[0]?.id ?? null })); setOpen(true); }} />
      {error && !data ? <Banner>{t('inc_loadError')}</Banner> : null}
      {loading ? <Loader /> : !(data ?? []).length ? <Empty>{t('inc_none')}</Empty> : data.map((item) => (
        <Card key={item.id}>
          <View style={styles.counters}>
            <Pill label={t(`inccat_${item.categorie}`)} />
            <Pill label={t(`incprio_${item.priorite}`)} tone={PRIO_TONE[item.priorite]} />
            <Pill label={t(`incstatus_${item.statut}`)} tone={item.statut === 'OPEN' ? 'danger' : item.statut === 'IN_PROGRESS' ? 'warning' : 'success'} />
          </View>
          <Text style={styles.name}>{item.groupe_nom}{item.pelerin_nom ? ` · ${item.pelerin_nom}` : ''}</Text>
          <Text style={styles.body}>{item.description}</Text>
          <Text style={styles.meta}>{formatDateTime(item.cree_le)}</Text>
        </Card>
      ))}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.cardTitle}>{t('inc_report')}</Text>
          {failed ? <Banner>{t('inc_saveError')}</Banner> : null}
          <Text style={styles.label}>{t('pr_group')}</Text>
          <Chips scroll value={form.groupe_id} onChange={(value) => setForm((c) => ({ ...c, groupe_id: value, pelerin_id: null }))} options={groups.map((group) => ({ value: group.id, label: group.nom }))} />
          <Text style={styles.label}>{t('inc_pilgrim')}</Text>
          <Chips scroll value={form.pelerin_id} onChange={(value) => setForm((c) => ({ ...c, pelerin_id: c.pelerin_id === value ? null : value }))} options={members.map((member) => ({ value: member.id, label: `${member.prenom} ${member.nom}` }))} />
          <Text style={styles.label}>{t('inc_category')}</Text>
          <Chips value={form.categorie} onChange={(value) => setForm((c) => ({ ...c, categorie: value }))} options={CATEGORIES.map((value) => ({ value, label: t(`inccat_${value}`) }))} />
          <Text style={styles.label}>{t('inc_priority')}</Text>
          <Chips value={form.priorite} onChange={(value) => setForm((c) => ({ ...c, priorite: value }))} options={PRIORITIES.map((value) => ({ value, label: t(`incprio_${value}`) }))} />
          <Field label={t('op_description')} value={form.description} onChangeText={(value) => setForm((c) => ({ ...c, description: value }))} multiline maxLength={4000} />
          <Button label={t('inc_submit')} loading={saving} disabled={!form.description.trim() || !form.groupe_id} onPress={submit} />
          <Button variant="ghost" label={t('cancel')} onPress={() => setOpen(false)} />
        </ScrollView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  counters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  actions: { flexDirection: 'row', gap: 6 },
  action: { flex: 1 },
  name: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.base, color: THEME.colors.textPrimary },
  big: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes.xl, color: THEME.colors.textPrimary },
  mono: { fontFamily: FONTS.monoRegular, fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary },
  meta: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary },
  body: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.sm, color: THEME.colors.textPrimary },
  cardTitle: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes.lg, color: THEME.colors.textPrimary },
  label: { fontFamily: FONTS.bodyMedium, fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary },
  modal: { flex: 1, backgroundColor: THEME.colors.background },
  modalContent: { padding: THEME.spacing.lg, gap: THEME.spacing.sm, paddingTop: THEME.spacing['2xl'] },
});
