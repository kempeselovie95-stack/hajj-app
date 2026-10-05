import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import GroupChatPage from '../encadreur/GroupChatPage.jsx';

/** Discussion du groupe assigné au pèlerin (même salon que celui de l'encadreur). */
export default function MyGroupPage() {
  const { api } = useAuth();
  const { t } = useLanguage();
  const [state, setState] = useState({ loading: true, groupId: null });

  useEffect(() => {
    api.operations.myTrip()
      .then((data) => setState({ loading: false, groupId: data?.groupe?.id ?? null }))
      .catch(() => setState({ loading: false, groupId: null }));
  }, [api]);

  if (state.loading) return <p className="text-sm text-slate-500">{t('loading')}</p>;
  if (!state.groupId) return <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">{t('gc_none')}</p>;
  return <GroupChatPage groupId={state.groupId} backTo="/pelerin/dashboard" />;
}
