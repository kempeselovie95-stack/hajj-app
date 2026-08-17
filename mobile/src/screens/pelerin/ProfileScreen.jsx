import { View, Text, StyleSheet } from 'react-native';
import { ROLE_LABELS, THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FONTS } from '../../hooks/useAppFonts.js';
import PrimaryButton from '../../components/PrimaryButton.jsx';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <InfoRow label="Nom" value={`${user?.prenom ?? ''} ${user?.nom ?? ''}`} />
        <InfoRow label="Email" value={user?.email} />
        <InfoRow label="Téléphone" value={user?.telephone} />
        <InfoRow label="Rôle" value={ROLE_LABELS[user?.role]} isLast />
      </View>

      <View style={styles.logoutContainer}>
        <PrimaryButton label="Se déconnecter" onPress={logout} />
      </View>
    </View>
  );
}

function InfoRow({ label, value, isLast = false }) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background, padding: THEME.spacing.lg },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: THEME.spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: THEME.colors.border },
  rowLabel: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.sm, color: THEME.colors.textSecondary },
  rowValue: { fontFamily: FONTS.bodyMedium, fontSize: THEME.typography.sizes.sm, color: THEME.colors.textPrimary },
  logoutContainer: { marginTop: THEME.spacing.xl },
});
