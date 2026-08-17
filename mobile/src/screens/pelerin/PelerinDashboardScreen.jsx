import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { DOSSIER_STATUS_LABELS, DOSSIER_STATUS_COLOR, THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FONTS } from '../../hooks/useAppFonts.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import DossierTimeline from '../../components/DossierTimeline.jsx';
import StatusHistoryTimeline from '../../components/StatusHistoryTimeline.jsx';

export default function PelerinDashboardScreen() {
  const { user, api } = useAuth();
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.dossiers.list({ page: 1, limite: 1 })
      .then((data) => {
        if (mounted) setDossier(data.dossiers?.[0] || null);
      })
      .catch(() => {
        if (mounted) setDossier(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [api]);

  const hasDossier = !!dossier?.numero_dossier;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Assalamu alaykum, {user?.prenom ?? ''}</Text>
      <Text style={styles.subtitle}>Voici l'état de ton dossier de pèlerinage.</Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            {hasDossier ? dossier.numero_dossier : 'Aucun dossier'}
          </Text>
          {hasDossier && dossier.historique && (
            <StatusBadge
              label={DOSSIER_STATUS_LABELS[dossier.statut]}
              semantic={DOSSIER_STATUS_COLOR[dossier.statut]}
            />
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={THEME.colors.primary} />
        ) : hasDossier ? (
          <DossierTimeline currentStatus={dossier.statut} />
        ) : (
          <Text style={styles.emptyText}>
            Tu n'as pas encore de dossier. Contacte ton agence pour en créer un.
          </Text>
        )}
      </View>

      {hasDossier && dossier.historique && (
        <View style={[styles.card, styles.historyCard]}>
          <Text style={styles.historyTitle}>Historique</Text>
          <StatusHistoryTimeline entries={dossier.historique ?? []} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: THEME.spacing.lg },
  greeting: {
    fontFamily: FONTS.displaySemibold,
    fontSize: THEME.typography.sizes['2xl'],
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
    marginBottom: THEME.spacing.xl,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.lg,
  },
  historyCard: { marginTop: THEME.spacing.lg, marginBottom: THEME.spacing.xl },
  historyTitle: {
    fontFamily: FONTS.displaySemibold,
    fontSize: THEME.typography.sizes.lg,
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },
  cardTitle: {
    fontFamily: FONTS.monoMedium,
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.textPrimary,
  },
  emptyText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
  },
});
