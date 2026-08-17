import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  DOCUMENT_STATUS,
  buildDocumentChecklist,
  computeDocumentProgress,
  validateDocumentFile,
  THEME,
} from '@hajj/shared';
import { FONTS } from '../../hooks/useAppFonts.js';
import ProgressBar from '../../components/ProgressBar.jsx';
import DocumentChecklistItem from '../../components/DocumentChecklistItem.jsx';
import UploadActionSheet from '../../components/UploadActionSheet.jsx';
import { MOCK_PELERIN_DOSSIER } from '../../mocks/mockDossier.js';

export default function DocumentsScreen() {
  // TODO(intégration) : charger via api.dossiers.list(...) au montage
  // (useEffect + état de chargement), au lieu du mock statique.
  const [dossier, setDossier] = useState(MOCK_PELERIN_DOSSIER);
  const [activeUpload, setActiveUpload] = useState(null); // { type, label } | null
  const [uploadingType, setUploadingType] = useState(null);

  const checklist = buildDocumentChecklist(dossier.documents);
  const progress = computeDocumentProgress(dossier.documents);

  function openUploadSheet(type, label) {
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

    setUploadingType(type);
    setActiveUpload(null);

    // TODO(intégration) : construire un FormData avec `file.uri` et
    // appeler api.documents.upload(dossier.id, formData). Le setTimeout
    // simule la latence réseau pour un rendu de démo crédible.
    setTimeout(() => {
      setDossier((prev) => ({
        ...prev,
        documents: [
          ...prev.documents.filter((d) => d.type !== type),
          { id: Date.now(), type, statut: DOCUMENT_STATUS.EN_ATTENTE },
        ],
      }));
      setUploadingType(null);
    }, 600);
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
      </ScrollView>

      <UploadActionSheet
        isVisible={!!activeUpload}
        documentLabel={activeUpload?.label ?? ''}
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
});
