import { View, Text, StyleSheet, TextInput, Alert, ScrollView, useState } from 'react-native';
import { ROLE_LABELS, THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FONTS } from '../../hooks/useAppFonts.js';
import PrimaryButton from '../../components/PrimaryButton.jsx';

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const [form, setForm] = useState({ nom: user?.nom || '', prenom: user?.prenom || '', email: user?.email || '', telephone: user?.telephone || '', ancien_mot_de_passe: '', mot_de_passe: '' });
  async function save() { try { await updateProfile(form); Alert.alert('Profile', 'Profile updated successfully.'); } catch (error) { Alert.alert('Profile', error.message); } }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <InfoRow label="Nom" value={`${user?.prenom ?? ''} ${user?.nom ?? ''}`} />
        <InfoRow label="Email" value={user?.email} />
        <InfoRow label="Téléphone" value={user?.telephone} />
        <InfoRow label="Rôle" value={ROLE_LABELS[user?.role]} isLast />
      </View>
      <View style={styles.editCard}><EditField label="First name" value={form.prenom} onChangeText={(value) => setForm((current) => ({ ...current, prenom: value }))} /><EditField label="Last name" value={form.nom} onChangeText={(value) => setForm((current) => ({ ...current, nom: value }))} /><EditField label="Email" value={form.email} onChangeText={(value) => setForm((current) => ({ ...current, email: value }))} keyboardType="email-address" /><EditField label="Phone" value={form.telephone} onChangeText={(value) => setForm((current) => ({ ...current, telephone: value }))} /><EditField label="Current password" value={form.ancien_mot_de_passe} onChangeText={(value) => setForm((current) => ({ ...current, ancien_mot_de_passe: value }))} secureTextEntry /><EditField label="New password" value={form.mot_de_passe} onChangeText={(value) => setForm((current) => ({ ...current, mot_de_passe: value }))} secureTextEntry /><PrimaryButton label="Save changes" onPress={save} /></View>

      <View style={styles.logoutContainer}>
        <PrimaryButton label="Se déconnecter" onPress={logout} />
      </View>
    </ScrollView>
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
  editCard: { marginTop: THEME.spacing.lg, backgroundColor: THEME.colors.surface, borderRadius: THEME.radius.lg, padding: THEME.spacing.md, borderWidth: 1, borderColor: THEME.colors.border },
  input: { borderWidth: 1, borderColor: THEME.colors.border, borderRadius: THEME.radius.sm, padding: 10, color: THEME.colors.textPrimary, marginTop: 4, marginBottom: 10 },
  editLabel: { fontFamily: FONTS.bodyMedium, color: THEME.colors.textSecondary, fontSize: THEME.typography.sizes.xs },
});

function EditField({ label, ...props }) { return <View><Text style={styles.editLabel}>{label}</Text><TextInput style={styles.input} {...props} /></View>; }
