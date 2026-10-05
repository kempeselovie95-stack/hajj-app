import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { useLive } from '../../hooks/useLive.js';
import { FONTS } from '../../hooks/useAppFonts.js';
import { toFormFile, fallbackName } from '../../utils/filePart.js';
import ProgressBar from '../../components/ProgressBar.jsx';
import UploadActionSheet from '../../components/UploadActionSheet.jsx';
import { Screen, Heading, Card, SectionTitle, Pill, Button, Banner, Empty, Loader, Field, Chips } from '../../ui/index.jsx';

const NUSUK_STAGES = ['soumis', 'en_verification', 'valide', 'transmis_nusuk', 'confirme'];
const METHODS = ['mobile_money', 'virement', 'especes', 'cheque', 'autre'];

const DOC_TONE = { PENDING: 'warning', UNDER_REVIEW: 'info', APPROVED: 'success', REJECTED: 'danger', EXPIRED: 'danger' };
const PAY_TONE = { en_attente: 'warning', valide: 'success', rejete: 'danger', annule: 'neutral' };
const STATUS_TONE = { brouillon: 'neutral', soumis: 'info', en_verification: 'warning', valide: 'success', transmis_nusuk: 'info', confirme: 'success', rejete: 'danger', annule: 'neutral' };
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'application/pdf'];

/** Mon dossier : statut, pièces à déposer, soumission, paiements et solde. */
export default function DossierScreen() {
  const { api } = useAuth();
  const { t, formatCurrency, formatDateTime } = useLanguage();
  const { data, loading, error, reload } = useLive(() => api.pelerin.summary(), [api]);
  const [activeUpload, setActiveUpload] = useState(null); // { type }
  const [expirationDate, setExpirationDate] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState({ tone: 'success', text: '' });
  const packagesLive = useLive(() => api.pelerin.packages(), [api]);
  const [payForm, setPayForm] = useState(null); // { montant, moyen_paiement, reference }

  const dossier = data?.dossier;
  const required = data?.types_requis ?? [];
  const docs = data?.documents ?? [];
  const byType = Object.fromEntries(docs.map((doc) => [doc.type, doc]));
  const approved = required.filter((type) => byType[type]?.statut === 'APPROVED').length;
  const sent = required.filter((type) => byType[type]).length;
  const canSubmit = dossier && ['brouillon', 'rejete'].includes(dossier.statut);
  const balance = data?.solde;

  const alertOrBanner = (title, text) => {
    // Alert.alert n'affiche rien sur le web : on passe par la bannière.
    if (Platform.OS === 'web') setMessage({ tone: 'danger', text });
    else Alert.alert(title, text);
  };

  async function handleFilePicked(type, file) {
    const mimeType = file.mimeType || (file.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
    if (!ACCEPTED.includes(mimeType)) { setActiveUpload(null); alertOrBanner(t('mob_invalidFile'), t('md_badType')); return; }
    if (file.size && file.size > MAX_BYTES) { setActiveUpload(null); alertOrBanner(t('mob_invalidFile'), t('md_tooBig')); return; }
    if (expirationDate && !/^\d{4}-\d{2}-\d{2}$/.test(expirationDate)) { alertOrBanner(t('mob_invalidDate'), t('mob_invalidDate')); return; }
    setActiveUpload(null); setBusy(type); setMessage({ tone: 'success', text: '' });
    try {
      const form = new FormData();
      form.append('type_document', type);
      if (expirationDate) form.append('expiration_date', expirationDate);
      form.append('fichier', await toFormFile({ uri: file.uri, name: file.name || fallbackName(type, mimeType), mimeType }));
      await api.documents.upload(dossier.id, form);
      setExpirationDate('');
      setMessage({ tone: 'success', text: t('md_uploaded') });
      reload();
    } catch (requestError) {
      setMessage({ tone: 'danger', text: requestError.status === 403 ? t('md_uploadError') : requestError.message || t('md_uploadError') });
    } finally { setBusy(''); }
  }

  async function pickCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { setActiveUpload(null); alertOrBanner(t('mob_permissionDenied'), t('mob_cameraPermission')); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled) { setActiveUpload(null); return; }
    const asset = result.assets[0];
    handleFilePicked(activeUpload.type, { uri: asset.uri, name: asset.fileName, mimeType: asset.mimeType ?? 'image/jpeg', size: asset.fileSize ?? 0 });
  }

  async function pickGallery() {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { setActiveUpload(null); alertOrBanner(t('mob_permissionDenied'), t('mob_galleryPermission')); return; }
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (result.canceled) { setActiveUpload(null); return; }
    const asset = result.assets[0];
    handleFilePicked(activeUpload.type, { uri: asset.uri, name: asset.fileName, mimeType: asset.mimeType ?? 'image/jpeg', size: asset.fileSize ?? 0 });
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({ type: ACCEPTED, copyToCacheDirectory: true });
    if (result.canceled) { setActiveUpload(null); return; }
    const asset = result.assets[0];
    handleFilePicked(activeUpload.type, { uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size: asset.size ?? 0 });
  }

  async function choosePackage(id) {
    setBusy(`pkg-${id}`); setMessage({ tone: 'success', text: '' });
    try { await api.pelerin.choosePackage(id); setMessage({ tone: 'success', text: t('md_packageChosen') }); reload(); packagesLive.reload(); }
    catch (requestError) { setMessage({ tone: 'danger', text: requestError.message || t('md_packageError') }); }
    finally { setBusy(''); }
  }

  async function declarePayment() {
    const montant = Number(String(payForm.montant).replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(montant) || montant <= 0) { setMessage({ tone: 'danger', text: t('md_amountInvalid') }); return; }
    setBusy('pay'); setMessage({ tone: 'success', text: '' });
    try {
      await api.pelerin.declarePayment({ montant, moyen_paiement: payForm.moyen_paiement, reference: payForm.reference });
      setPayForm(null); setMessage({ tone: 'success', text: t('md_paymentDeclared' ) }); reload();
    } catch (requestError) {
      setMessage({ tone: 'danger', text: requestError.code === 'NO_PACKAGE' ? t('md_needPackage') : requestError.code === 'OVERPAY' ? t('md_overpay') : requestError.message || t('md_paymentError') });
    } finally { setBusy(''); }
  }

  async function submit() {
    setBusy('submit'); setMessage({ tone: 'success', text: '' });
    try { await api.dossiers.updateStatus(dossier.id, 'soumis'); setMessage({ tone: 'success', text: t('md_submitted') }); reload(); }
    catch (requestError) { setMessage({ tone: 'danger', text: requestError.code === 'DOCUMENTS_MISSING' ? t('md_missingDocs') : t('md_submitError') }); }
    finally { setBusy(''); }
  }

  return (
    <Screen>
      <Heading kicker={dossier?.numero_dossier} title={t('md_title')} subtitle={dossier ? [dossier.forfait, dossier.agence, `Hajj ${dossier.annee_hajj}`].filter(Boolean).join(' · ') : undefined}
        right={dossier ? <Pill label={t(`status_${dossier.statut}`)} tone={STATUS_TONE[dossier.statut]} /> : null} />
      {error && !data ? <Banner>{t('mob_loadError')}</Banner> : null}
      <Banner tone={message.tone}>{message.text}</Banner>
      {loading ? <Loader /> : !dossier ? <Empty>{t('md_noDossier')}</Empty> : (
        <>
          <SectionTitle>{t('nusuk_title')}</SectionTitle>
          <Card>
            <View style={styles.stages}>
              {NUSUK_STAGES.map((stage, index) => {
                const current = NUSUK_STAGES.indexOf(dossier.statut);
                const state = index < current ? 'done' : index === current ? 'current' : 'todo';
                return (
                  <View key={stage} style={[styles.stage, state === 'done' && styles.stageDone, state === 'current' && styles.stageCurrent]}>
                    <Text style={[styles.stageText, state === 'current' && { color: '#fff' }, state === 'done' && { color: THEME.colors.primary }]}>{state === 'done' ? '✓ ' : ''}{t(`nusuk_stage_${stage}`)}</Text>
                  </View>
                );
              })}
            </View>
            {dossier.statut === 'rejete' ? <Text style={styles.reject}>{dossier.nusuk?.motif || t('status_rejete')}</Text> : null}
            {dossier.nusuk?.reference ? <Text style={styles.docMeta}>{t('nusuk_reference')} : <Text style={styles.mono}>{dossier.nusuk.reference}</Text></Text> : null}
            {dossier.nusuk?.visa ? <Text style={styles.docMeta}>{t('nusuk_visa')} : <Text style={styles.mono}>{dossier.nusuk.visa}</Text></Text> : null}
          </Card>

          <SectionTitle>{t('md_package')}</SectionTitle>
          <Card>
            {(packagesLive.data?.items ?? []).length === 0 ? <Text style={styles.docMeta}>{t('md_noPackages')}</Text> : packagesLive.data.items.map((pkg) => (
              <View key={pkg.id} style={[styles.pkg, pkg.choisi && styles.pkgActive]}>
                <View style={styles.flex1}>
                  <Text style={styles.docLabel}>{pkg.nom}{pkg.choisi ? '  ✓' : ''}</Text>
                  <Text style={styles.docMeta}>{formatCurrency(pkg.prix, pkg.devise)}</Text>
                  {pkg.description || pkg.inclus ? <Text style={styles.docMeta} numberOfLines={3}>{pkg.description || pkg.inclus}</Text> : null}
                </View>
                {!pkg.choisi && packagesLive.data.modifiable ? <Button small variant="outline" label={t('md_choose')} loading={busy === `pkg-${pkg.id}`} onPress={() => choosePackage(pkg.id)} /> : null}
              </View>
            ))}
            {packagesLive.data && !packagesLive.data.modifiable && (packagesLive.data.items ?? []).length > 0 ? <Text style={styles.hint}>{t('md_packageLocked')}</Text> : null}
          </Card>

          <SectionTitle>{t('md_documents')}</SectionTitle>
          <Card>
            <ProgressBar percent={required.length ? Math.round((approved / required.length) * 100) : 0} label={t('md_progress', { approved, total: required.length })} />
            {required.map((type) => {
              const doc = byType[type];
              const editable = !doc || doc.statut === 'REJECTED' || canSubmit; // une pièce manquante ou rejetée peut toujours être (re)déposée
              return (
                <View key={type} style={styles.docRow}>
                  <View style={styles.flex1}>
                    <Text style={styles.docLabel}>{t(`doctype_${type}`)}</Text>
                    <Text style={styles.docMeta} numberOfLines={1}>{doc ? doc.nom_fichier : t('dci_notSent')}</Text>
                    {doc?.statut === 'REJECTED' && doc.motif_rejet ? <Text style={styles.reject}>{t('dci_reason', { reason: doc.motif_rejet })}</Text> : null}
                    <View style={{ marginTop: 6 }}><Pill label={doc ? t(`dmstatus_${doc.statut}`) : t('dci_missing')} tone={doc ? DOC_TONE[doc.statut] : 'neutral'} /></View>
                  </View>
                  {editable ? <Button small variant="outline" label={doc ? t('mob_replace') : t('mob_add')} loading={busy === type} onPress={() => { setExpirationDate(''); setMessage({ tone: 'success', text: '' }); setActiveUpload({ type }); }} /> : null}
                </View>
              );
            })}
            <Text style={styles.hint}>{t('md_fileHint')}</Text>
            {canSubmit ? (
              <View style={styles.submitBox}>
                <Text style={styles.docMeta}>{sent < required.length ? t('md_missingCount', { count: required.length - sent }) : t('md_readyToSubmit')}</Text>
                <Button label={t('md_submit')} disabled={sent < required.length} loading={busy === 'submit'} onPress={submit} />
              </View>
            ) : null}
          </Card>

          <SectionTitle>{t('md_payments')}</SectionTitle>
          <Card>
            <View style={styles.amounts}>
              {[['md_total', balance.total], ['md_paid', balance.paye], ['md_pending', balance.en_attente], ['md_remaining', balance.restant]].map(([key, value]) => (
                <View key={key} style={styles.amount}><Text style={styles.amountLabel}>{t(key)}</Text><Text style={styles.amountValue}>{formatCurrency(value, balance.devise)}</Text></View>
              ))}
            </View>
            <ProgressBar percent={balance.total ? Math.min(100, Math.round((balance.paye / balance.total) * 100)) : 0} label={t('md_paidShare')} />
            {data.paiements.length === 0 ? <Text style={styles.docMeta}>{t('md_noPayments')}</Text> : data.paiements.map((payment) => (
              <View key={payment.id} style={styles.payRow}>
                <View style={styles.flex1}>
                  <Text style={styles.docLabel}>{formatCurrency(payment.montant, payment.devise)}</Text>
                  <Text style={styles.docMeta}>{t(`method_${payment.moyen_paiement}`)} · {formatDateTime(payment.cree_le)}</Text>
                </View>
                <Pill label={t(`paystatus_${payment.statut}`)} tone={PAY_TONE[payment.statut]} />
              </View>
            ))}
            {balance.restant > 0 ? (payForm ? (
              <View style={styles.submitBox}>
                <Field label={t('md_amount')} value={payForm.montant} onChangeText={(value) => setPayForm((current) => ({ ...current, montant: value }))} keyboardType="numeric" placeholder={String(balance.restant)} />
                <Chips scroll value={payForm.moyen_paiement} onChange={(value) => setPayForm((current) => ({ ...current, moyen_paiement: value }))} options={METHODS.map((value) => ({ value, label: t(`method_${value}`) }))} />
                <Field label={t('md_reference')} value={payForm.reference} onChangeText={(value) => setPayForm((current) => ({ ...current, reference: value }))} placeholder={t('md_referenceHint')} />
                <Button label={t('md_declareSend')} loading={busy === 'pay'} onPress={declarePayment} />
                <Button variant="ghost" label={t('cancel')} onPress={() => setPayForm(null)} />
              </View>
            ) : <Button variant="outline" label={`💳  ${t('md_declarePayment')}`} onPress={() => setPayForm({ montant: String(balance.restant), moyen_paiement: 'mobile_money', reference: '' })} />) : null}
            <Text style={styles.hint}>{t('md_paymentHint')}</Text>
          </Card>

          <SectionTitle>{t('md_history')}</SectionTitle>
          <Card>
            {(data.historique ?? []).length === 0 ? <Text style={styles.docMeta}>{t('md_noHistory')}</Text> : data.historique.map((entry, index) => (
              <View key={`${entry.cree_le}-${index}`} style={styles.timeline}>
                <View style={[styles.dot, index === 0 && styles.dotActive]} />
                <View style={styles.flex1}>
                  <Text style={styles.docLabel}>{t(`status_${entry.statut}`)}</Text>
                  {entry.commentaire ? <Text style={styles.docMeta}>{entry.commentaire}</Text> : null}
                  <Text style={styles.docMeta}>{formatDateTime(entry.cree_le)}</Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      <UploadActionSheet
        isVisible={!!activeUpload}
        documentLabel={activeUpload ? t(`doctype_${activeUpload.type}`) : ''}
        expirationDate={expirationDate}
        onExpirationDateChange={setExpirationDate}
        showCamera={Platform.OS !== 'web'}
        onClose={() => setActiveUpload(null)}
        onPickCamera={pickCamera}
        onPickGallery={pickGallery}
        onPickFile={pickFile}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: THEME.colors.border },
  docLabel: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.base, color: THEME.colors.textPrimary },
  docMeta: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary, marginTop: 2 },
  reject: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.xs, color: THEME.colors.danger, marginTop: 2 },
  hint: { fontFamily: FONTS.bodyRegular, fontSize: 11, color: THEME.colors.textSecondary },
  submitBox: { gap: 8, backgroundColor: THEME.colors.surfaceMuted, borderRadius: THEME.radius.md, padding: 12 },
  amounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amount: { flexGrow: 1, minWidth: '45%', backgroundColor: THEME.colors.surfaceMuted, borderRadius: THEME.radius.md, padding: 10 },
  amountLabel: { fontFamily: FONTS.bodyMedium, fontSize: 11, color: THEME.colors.textSecondary },
  amountValue: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.base, color: THEME.colors.textPrimary, marginTop: 2 },
  stages: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stage: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: THEME.colors.surfaceMuted },
  stageDone: { backgroundColor: THEME.colors.primaryTint },
  stageCurrent: { backgroundColor: THEME.colors.primary },
  stageText: { fontFamily: FONTS.bodySemibold, fontSize: 11, color: THEME.colors.textSecondary },
  mono: { fontFamily: FONTS.monoRegular, color: THEME.colors.textPrimary },
  pkg: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: THEME.radius.md, borderWidth: 1, borderColor: THEME.colors.border },
  pkgActive: { borderColor: THEME.colors.primary, backgroundColor: THEME.colors.primaryTint },
  timeline: { flexDirection: 'row', gap: 12, paddingVertical: 6 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: THEME.colors.border, marginTop: 4 },
  dotActive: { backgroundColor: THEME.colors.primary },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: THEME.colors.border },
});
