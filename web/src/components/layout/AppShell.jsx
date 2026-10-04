import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { NotificationsProvider, useNotifications } from '../../contexts/NotificationsContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

const NAV_GROUPS = {
  pelerin: [
    {
      title: 'PRINCIPAL',
      links: [
        { to: '/dashboard', key: 'dashboard', label: 'Tableau de bord' },
        { to: '/pelerin/profile', key: 'profile', label: 'Mon compte' },
      ],
    },
  ],
  admin: [
    {
      title: 'PRINCIPAL',
      links: [
        { to: '/admin/dashboard', key: 'dashboard', label: 'Tableau de bord' },
        { to: '/admin/pelerins', key: 'pilgrims', label: 'Pèlerins' },
        { to: '/admin/paiements', key: 'payments', label: 'Paiements' },
        { to: '/admin/documents', key: 'documents', label: 'Documents' },
      ],
    },
    {
      title: 'OPÉRATIONS',
      links: [
        { to: '/admin/encadreurs', key: 'guides', label: 'Guides' },
        { to: '/admin/voyages', key: 'travel', label: 'Voyages' },
      ],
    },
    {
      title: 'COMMUNICATION',
      links: [
        { to: '/admin/presence', key: 'presence', label: 'QR & Présence' },
      ],
    },
    { title: 'ANALYTIQUE', links: [{ to: '/admin/statistiques', key: 'statistics', label: 'Statistiques' }] },
    { title: 'ORGANISATION', links: [{ to: '/admin/organisations', key: 'organisation', label: 'Organisation' }] },
    { title: 'SYSTÈME', links: [{ to: '/admin/parametres', key: 'settings', label: 'Paramètres' }] },
  ],
  agence: [
    {
      title: 'PRINCIPAL',
      links: [
        { to: '/agence/dashboard', key: 'dashboard', label: 'Tableau de bord' },
        { to: '/agence/pelerins', key: 'pilgrims', label: 'Pèlerins' },
        { to: '/agence/paiements', key: 'payments', label: 'Paiements' },
        { to: '/agence/documents', key: 'documents', label: 'Documents' },
      ],
    },
    {
      title: 'OPÉRATIONS',
      links: [
        { to: '/agence/guides', key: 'guides', label: 'Guides' },
        { to: '/agence/voyages', key: 'travel', label: 'Voyages' },
      ],
    },
    {
      title: 'COMMUNICATION',
      links: [
        { to: '/agence/presence', key: 'presence', label: 'QR & Présence' },
      ],
    },
  ],
  encadreur: [
    {
      title: 'PRINCIPAL',
      links: [
        { to: '/encadreur/dashboard', key: 'dashboard', label: 'Tableau de bord' },
        { to: '/encadreur/groupes', key: 'groups', label: 'Groupes', end: false },
      ],
    },
  ],
};

function Icon({ name, isActive }) {
  const base = 'h-4 w-4 transition-colors';
  const color = isActive ? '#ffffff' : '#4a5565';

  const icons = {
    dashboard: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base} style={{ color }}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="4" rx="1.5" />
        <rect x="14" y="11" width="7" height="10" rx="1.5" />
        <rect x="3" y="12" width="7" height="9" rx="1.5" />
      </svg>
    ),
    pilgrims: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base} style={{ color }}>
        <path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
        <circle cx="10" cy="7" r="3" />
        <path d="M20 19v-1a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    payments: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base} style={{ color }}>
        <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
        <path d="M2.5 10.5h19" />
        <path d="M7 15.5h3" />
      </svg>
    ),
    documents: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base} style={{ color }}>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
        <path d="M14 3v4h4" />
        <path d="M8 12h8M8 16h8" />
      </svg>
    ),
    groups: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base} style={{ color }}>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3.5 18a5.5 5.5 0 0 1 11 0" />
        <path d="M12.5 18a5 5 0 0 1 7.5-4.5" />
      </svg>
    ),
    guides: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base} style={{ color }}>
        <path d="M4 19V5.5A2.5 2.5 0 0 1 6.5 3H20v14.5A2.5 2.5 0 0 0 17.5 15H6.5A2.5 2.5 0 0 0 4 17.5z" />
        <path d="M8 7h8M8 11h8" />
      </svg>
    ),
    travel: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base} style={{ color }}>
        <path d="M3 16l5-6 5 5 8-9" />
        <path d="M16 6h5v5" />
      </svg>
    ),
    presence: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base} style={{ color }}>
        <path d="M7 9.5a5 5 0 0 1 10 0v5A5 5 0 0 1 7 14.5zm5 9.5v-5" />
        <path d="M12 3v2" />
      </svg>
    ),
    statistics: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base} style={{ color }}>
        <path d="M4 20V10m5 10V4m5 16v-7m5 7V7" /><path d="M2 20h20" />
      </svg>
    ),
    organisation: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base} style={{ color }}>
        <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 8h2m4 0h2M8 12h2m4 0h2M8 16h8" />
      </svg>
    ),
    settings: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base} style={{ color }}>
        <circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" transform="translate(-1 -1) scale(1.08)" />
      </svg>
    ),
  };

  return icons[name] || icons.dashboard;
}

export default function AppShell() {
  return (
    <NotificationsProvider>
      <AppShellContent />
    </NotificationsProvider>
  );
}

function AppShellContent() {
  const { user, logout, api } = useAuth();
  const { t } = useLanguage();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [menuBadges, setMenuBadges] = useState({ pilgrims: 0, documents: 0 });
  const groups = NAV_GROUPS[user?.role] ?? [];
  const profileRoute = {
    admin: '/admin/profile',
    agence: '/agence/profile',
    encadreur: '/encadreur/profile',
    pelerin: '/pelerin/profile',
  }[user?.role] ?? '/admin/profile';
  const roleLabel = {
    admin: t('roleAdmin'),
    agence: t('roleAgency'),
    encadreur: t('roleGuide'),
    pelerin: t('rolePilgrim'),
  }[user?.role] ?? t('rolePilgrim');
  const userInitials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase() || 'U';
  const notificationRoute = {
    admin: '/admin/notifications',
    agence: '/agence/notifications',
    encadreur: '/encadreur/notifications',
    pelerin: '/pelerin/notifications',
  }[user?.role] ?? '/login';

  useEffect(() => {
    let active = true;
    async function refreshBadges() {
      try {
        const result = await api.dashboard.sidebarBadges();
        if (active) setMenuBadges(result.badges || { pilgrims: 0, documents: 0 });
      } catch {
        if (active) setMenuBadges({ pilgrims: 0, documents: 0 });
      }
    }
    refreshBadges();
    const interval = window.setInterval(refreshBadges, 30000);
    return () => { active = false; window.clearInterval(interval); };
  }, [api, user?.id, user?.role]);

  return (
    <div className="h-dvh overflow-hidden bg-[#edf1f4] text-slate-800">
      {mobileNavOpen && <button type="button" aria-label="Fermer le menu" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-40 bg-slate-950/35 md:hidden" />}
      <div className="flex h-dvh min-w-0">
        <aside className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(84vw,260px)] shrink-0 flex-col border-r border-[#dde3e8] bg-[#f5f7f6] transition-transform md:sticky md:top-0 md:z-20 md:w-[260px] md:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-[96px] shrink-0 items-center gap-3 border-b border-[#e4e8ec] px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf4f1] text-[10px] font-bold text-[#1f2d2a] ring-1 ring-[#dfe8e5] shadow-sm">
              HF
            </div>
            <div className="leading-tight">
              <div className="text-[18px] font-semibold tracking-[-0.04em] text-[#2b2d2f]">MyHajj237</div>
              <div className="text-[9px] tracking-[0.2em] text-slate-400">CAMEROUN</div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]">
            <div className="mb-5 flex items-center gap-2 rounded-lg bg-[#eaf6f1] px-3 py-2 text-[13px] font-medium text-[#2b7b66] ring-1 ring-[#cfe6dc]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#2f8e6f]" />
              Hajj 2027 - Actif
            </div>

            {groups.map((group) => (
              <div key={group.title} className="mb-5">
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{group.title}</p>
                <nav className="space-y-1">
                  {group.links.map((link) => (
                    <NavLink
                      key={`${group.title}-${link.key}`}
                      to={link.to}
                      end={link.end ?? true}
                      onClick={() => setMobileNavOpen(false)}
                      className={({ isActive }) =>
                        `group flex items-center rounded-lg px-3 py-2.5 text-[14px] font-medium transition-all ${
                          isActive
                            ? 'bg-[#0d8a6f] text-white shadow-[0_4px_12px_rgba(13,138,111,0.2)]'
                            : 'text-slate-600 hover:bg-[#edf1f5] hover:text-slate-800'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className="mr-3 inline-flex h-4 w-4 items-center justify-center">
                            <Icon name={link.key} isActive={isActive} />
                          </span>
                          <span className="leading-none">{link.label || t(link.key)}</span>
                          {menuBadges[link.key] > 0 && (
                            <span
                              className={`ml-auto inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-[2px] text-[10px] font-semibold ${
                                isActive ? 'bg-white/15 text-white' : 'bg-[#f0c875] text-[#725d24]'
                              }`}
                            >
                              {menuBadges[link.key]}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </nav>
              </div>
            ))}
          </div>

          <div className="shrink-0 border-t border-[#e4e8ee] p-4">
            <div className="flex items-center gap-2 rounded-xl bg-[#f0f2f5] p-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2b3f4d] text-sm font-semibold text-white">{userInitials}</div>
              <button
                type="button"
                onClick={() => navigate(profileRoute)}
                className="min-w-0 flex-1 text-left leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d8a6f]"
                aria-label="Ouvrir la gestion du compte"
              >
                <span className="block truncate text-[14px] font-semibold text-slate-700">{user?.prenom || 'Ibrahim'} {user?.nom || 'Amadou'}</span>
                <span className="block truncate text-[11px] text-slate-500">{roleLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => { logout(); navigate('/login', { replace: true }); }}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d8a6f]"
                aria-label={t('logout')}
                title={t('logout')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden="true">
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H3" />
                  <path d="M12 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        <div className="flex h-dvh min-w-0 min-h-0 flex-1 flex-col bg-[#f3f5f8]">
          <div className="flex h-12 shrink-0 items-center border-b border-slate-200 px-3">
            <button type="button" onClick={() => setMobileNavOpen(true)} aria-label="Ouvrir le menu" aria-expanded={mobileNavOpen} className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-700 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 md:hidden">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <span className="ml-2 text-sm font-semibold text-slate-700 md:hidden">MyHajj237</span>
            <Link to={notificationRoute} aria-label={`Notifications : ${unreadCount} non lue${unreadCount === 1 ? '' : 's'}`} title={`${unreadCount} notification${unreadCount === 1 ? '' : 's'} non lue${unreadCount === 1 ? '' : 's'}`} className="relative ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
              {unreadCount > 0 && <span className="absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#f3f5f8]">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </Link>
          </div>
          <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4 sm:px-5">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
