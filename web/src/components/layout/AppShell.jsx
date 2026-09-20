import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { NotificationsProvider, useNotifications } from '../../contexts/NotificationsContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import LanguageSelector from '../common/LanguageSelector.jsx';

/**
 * Liens de navigation par rôle. Ajouter une entrée ici suffit à la faire
 * apparaître dans la sidebar — pas de logique conditionnelle éparpillée
 * dans le JSX.
 */
const NAV_LINKS_BY_ROLE = {
  admin: [
    { to: '/admin/dashboard', key: 'overview' },
    { to: '/admin/agences', key: 'agencies' },
    { to: '/admin/encadreurs', key: 'encadreurs' },
    { to: '/admin/dossiers', key: 'dossiers' },
    { to: '/admin/notifications', key: 'notifications' },
  ],
  agence: [
    { to: '/agence/dashboard', key: 'overview' },
    { to: '/agence/dossiers', key: 'dossiers' },
    { to: '/agence/pelerins', key: 'pilgrims' },
    { to: '/agence/notifications', key: 'notifications' },
  ],
  encadreur: [
    { to: '/encadreur/dashboard', key: 'groups' },
    { to: '/encadreur/notifications', key: 'notifications' },
  ],
};

export default function AppShell() {
  return (
    <NotificationsProvider>
      <AppShellContent />
    </NotificationsProvider>
  );
}

function AppShellContent() {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const links = NAV_LINKS_BY_ROLE[user?.role] ?? [];
  const translatedLinks = links.map((link) => ({
    ...link,
    label: t(link.key),
  }));
  const recentAlerts = notifications.filter((notification) => !notification.lue).slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface md:block">
          <div className="flex h-16 items-center border-b border-border px-6">
            <span className="font-display text-lg font-semibold text-primary">Hajj</span>
          </div>
          <nav className="flex flex-col gap-1 p-4">
            {translatedLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 font-body text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-tint text-primary'
                      : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
            <div /> {/* réservé : fil d'Ariane / titre de page contextuel */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <button onClick={() => navigate(`/${user?.role}/notifications`)} aria-label="Notifications" className="relative text-text-secondary hover:text-text-primary">
                  <span className="text-lg" aria-hidden="true">🔔</span>
                  {unreadCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 font-mono text-[10px] font-semibold text-[#FAF7F0]">{unreadCount}</span>}
                </button>
                {recentAlerts.length > 0 && <div className="absolute right-0 top-8 z-30 hidden w-80 space-y-2 rounded-lg border border-border bg-surface p-3 shadow-elevated group-hover:block group-focus-within:block">{recentAlerts.map((notification) => <button key={notification.id} onClick={() => markAsRead(notification.id)} className={`w-full rounded-md border-l-4 p-3 text-left ${alertClasses(notification.type)}`}><p className="text-sm font-semibold">{notification.titre}</p><p className="mt-1 text-xs opacity-80">{notification.message}</p></button>)}</div>}
              </div>
              <LanguageSelector />
              <NavLink to={user?.role === 'pelerin' ? '/pelerin/profile' : `/${user?.role}/profile`} className="font-body text-sm text-text-secondary hover:text-text-primary">{user?.prenom} {user?.nom}</NavLink>
              <span className="font-body text-sm text-text-secondary">
                {user?.prenom} {user?.nom}
              </span>
              <button
                onClick={logout}
                className="font-body text-sm font-medium text-text-secondary hover:text-danger"
              >
                {t('logout')}
              </button>
            </div>
          </header>

          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function alertClasses(type) {
  if (type === 'document_rejete' || type === 'danger' || type === 'erreur') return 'border-danger bg-danger-tint text-danger';
  if (type === 'document_valide' || type === 'success' || type === 'succes') return 'border-success bg-success-tint text-success';
  return 'border-warning bg-warning-tint text-warning';
}
