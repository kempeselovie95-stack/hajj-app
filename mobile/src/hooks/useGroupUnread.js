import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLive } from './useLive.js';

/** Messages de groupe non lus : { total, byGroup } — se met à jour avec la synchronisation « live » et le temps réel. */
export function useGroupUnread() {
  const { api, isAuthenticated } = useAuth();
  const { data } = useLive(() => (isAuthenticated ? api.groups.unread() : Promise.resolve({ items: [], total: 0 })), [api, isAuthenticated]);
  return useMemo(() => ({
    total: data?.total ?? 0,
    byGroup: Object.fromEntries((data?.items ?? []).map((item) => [item.groupe_id, item.non_lus])),
  }), [data]);
}
