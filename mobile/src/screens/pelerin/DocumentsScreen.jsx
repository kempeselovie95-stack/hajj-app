import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  DOCUMENT_STATUS,
  DOCUMENT_TYPE_LABELS,
  OPTIONAL_DOCUMENT_TYPES,
  buildDocumentChecklist,
  computeDocumentProgress,
  validateDocumentFile,
  THEME,
} from '@hajj/shared';
import { FONTS } from '../../hooks/useAppFonts.js';
import ProgressBar from '../../components/ProgressBar.jsx';
import DocumentChecklistItem from '../../components/DocumentChecklistItem.jsx';
import UploadActionSheet from '../../components/UploadActionSheet.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function DocumentsScreen() {
  const { api } = useAuth();
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeUpload, setActiveUpload] = useState(null); // { type, label } | null
  const [uploadingType, setUploadingType] = useState(null);
  const [expirationDate, setExpirationDate] = useState('');

  useEffect(() => {
    let mounted = true;
    api.dossiers.list({ page: 1, limite: 1 })
      .then(async (data) => {
        const summary = data.dossiers?.[0];
        if (!summary) return;
        const detail = await api.dossiers.getById(summary.id);
        if (mounted) setDossier(detail.dossier);
      })
      .catch(() => {
        if (mounted) setDossier(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [api]);

  const checklist = buildDocumentChecklist(dossier.documents);
  const progress = computeDocumentProgress(dossier.documents);
  const optionalDocuments = OPTIONAL_DOCUMENT_TYPES.map((type) => ({
    type,
    label: DOCUMENT_TYPE_LABELS[type],
    document: dossier.documents?.find((document) => document.type === type) ?? null,
  }));

  function openUploadSheet(type, label) {
    setExpirationDate('');
    setActiveUpload({ type, label });
  }

  /**
   * Reçoit un fichier déjà sélectionné (photo, image galerie ou document)
   * et l'ajoute au dossier local en statut "en_attente". La validation
   * client (taille/format) passe par le validateur partagé.
   */
  function handleFilePicked(type, file) {
    const validationError = validateDocumentFile(file);
    if (validationError) {
      Alert.alert('Fichier invalide', validationError);
      return;
    }
    if (expirationDate && !/^\d{4}-\d{2}-\d{2}$/.test(expirationDate)) {
      Alert.alert('Date invalide', 'Saisis la date au format AAAA-MM-JJ.');
      return;
    }

    setUploadingType(type);
    setActiveUpload(null);

    const formData = new FormData();
    formData.append('type_document', type);
    if (expirationDate) formData.append('expiration_date', expirationDate);
    formData.append('fichier', {
      uri: file.uri,
      name: file.name ?? `${type}.jpg`,
      type: file.mimeType,
    });

    api.documents.upload(dossier.id, formData)
      .then(() => api.dossiers.getById(dossier.id))
      .then((data) => { setDossier(data.dossier); setExpirationDate(''); })
      .catch((error) => Alert.alert('Envoi impossible', error.message))
      .finally(() => setUploadingType(null));
  }

  async function handlePickCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setActiveUpload(null);
      Alert.alert('Permission refusée', "L'accès à l'appareil photo est nécessaire pour cette action.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      const asset = result.assets[0];
      handleFilePicked(activeUpload.type, {
        uri: asset.uri,
        mimeType: 'image/jpeg',
        size: asset.fileSize ?? 0,
      });
    } else {
      setActiveUpload(null);
    }
  }

  async function handlePickGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setActiveUpload(null);
      Alert.alert('Permission refusée', "L'accès à la galerie est nécessaire pour cette action.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled) {
      const asset = result.assets[0];
      handleFilePicked(activeUpload.type, {
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        size: asset.fileSize ?? 0,
      });
    } else {
      setActiveUpload(null);
    }
  }

  async function handlePickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      handleFilePicked(activeUpload.type, {
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'application/pdf',
        size: asset.size ?? 0,
      });
    } else {
      setActiveUpload(null);
    }
  }

  return (
    <View style={styles.flex}>
      {loading ? (
        <ActivityIndicator style={styles.loader} color={THEME.colors.primary} />
      ) : !dossier ? (
        <Text style={styles.emptyText}>Aucun dossier disponible.</Text>
      ) : (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mes documents</Text>
        <Text style={styles.subtitle}>{dossier.numero_dossier}</Text>

        <View style={styles.progressCard}>
          <ProgressBar percent={progress.percent} label={`${progress.validated}/${progress.total} validés`} />
        </View>

        <View style={styles.checklistCard}>
          {checklist.map(({ type, label, document }) => (
            <DocumentChecklistItem
              key={type}
              label={label}
              document={document}
              isUploading={uploadingType === type}
              onPressAdd={() => openUploadSheet(type, label)}
            />
          ))}
        </View>

        <View style={styles.optionalSection}>
          <Text style={styles.optionalTitle}>Autres documents</Text>
          <Text style={styles.optionalDescription}>Pièces complémentaires non obligatoires pour la progression du dossier.</Text>
          <View style={styles.checklistCard}>
            {optionalDocuments.map(({ type, label, document }) => (
              <DocumentChecklistItem
                key={type}
                label={label}
                document={document}
                isUploading={uploadingType === type}
                onPressAdd={() => openUploadSheet(type, label)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
      )}

      <UploadActionSheet
        isVisible={!!activeUpload}
        documentLabel={activeUpload?.label ?? ''}
        expirationDate={expirationDate}
        onExpirationDateChange={setExpirationDate}
        onClose={() => setActiveUpload(null)}
        onPickCamera={handlePickCamera}
        onPickGallery={handlePickGallery}
        onPickFile={handlePickFile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: THEME.colors.background },
  loader: { flex: 1 },
  emptyText: { margin: THEME.spacing.lg, color: THEME.colors.textSecondary },
  content: { padding: THEME.spacing.lg },
  title: {
    fontFamily: FONTS.displaySemibold,
    fontSize: THEME.typography.sizes['2xl'],
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontFamily: FONTS.monoRegular,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    marginBottom: THEME.spacing.lg,
  },
  progressCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
  },
  checklistCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: THEME.spacing.md,
  },
  optionalSection: { marginTop: THEME.spacing.lg },
  optionalTitle: {
    fontFamily: FONTS.displaySemibold,
    fontSize: THEME.typography.sizes.lg,
    color: THEME.colors.textPrimary,
  },
  optionalDescription: {
    fontFamily: FONTS.bodyRegular,
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    marginBottom: THEME.spacing.md,
  },
});
