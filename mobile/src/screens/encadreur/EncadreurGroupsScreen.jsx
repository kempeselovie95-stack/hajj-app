import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FONTS } from '../../hooks/useAppFonts.js';

export default function EncadreurGroupsScreen() {
  const { api } = useAuth();
  const navigation = useNavigation();
  const [groups, setGroups] = useState([]);
  useEffect(() => { api.groups.list().then((data) => setGroups(data.groupes ?? [])).catch(() => setGroups([])); }, [api]);
  return <FlatList data={groups} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.content} ListHeaderComponent={<Text style={styles.title}>My pilgrim groups</Text>} ListEmptyComponent={<Text style={styles.empty}>No group assigned yet.</Text>} renderItem={({ item }) => <Pressable style={styles.card} onPress={() => navigation.navigate('GroupChat', { groupId: item.id, groupName: item.nom })}><Text style={styles.name}>{item.nom}</Text><Text style={styles.meta}>{item.total_membres} pilgrims · {item.annee_hajj}</Text><Text style={styles.action}>Open chat</Text></Pressable>} />;
}
const styles = StyleSheet.create({ content: { padding: THEME.spacing.lg, backgroundColor: THEME.colors.background, flexGrow: 1 }, title: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes['2xl'], color: THEME.colors.textPrimary, marginBottom: THEME.spacing.lg }, card: { backgroundColor: THEME.colors.surface, borderColor: THEME.colors.border, borderWidth: 1, borderRadius: THEME.radius.lg, padding: THEME.spacing.md, marginBottom: THEME.spacing.sm }, name: { fontFamily: FONTS.bodySemibold, color: THEME.colors.textPrimary, fontSize: THEME.typography.sizes.base }, meta: { fontFamily: FONTS.bodyRegular, color: THEME.colors.textSecondary, marginTop: 6 }, action: { fontFamily: FONTS.bodySemibold, color: THEME.colors.primary, marginTop: 12 }, empty: { fontFamily: FONTS.bodyRegular, color: THEME.colors.textSecondary } });
