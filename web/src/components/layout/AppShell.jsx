import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { NotificationsProvider, useNotifications } from '../../contexts/NotificationsContext.jsx';

/**
 * Liens de navigation par rôle. Ajouter une entrée ici suffit à la faire
 * apparaître dans la sidebar — pas de logique conditionnelle éparpillée
 * dans le JSX.
 */
const NAV_LINKS_BY_ROLE = {
  admin: [
    { to: '/admin/dashboard', label: 'Vue d\'ensemble' },
    { to: '/admin/agences', label: 'Agences' },
    { to: '/admin/dossiers', label: 'Dossiers' },
    { to: '/admin/notifications', label: 'Notifications' },
  ],
  agence: [
    { to: '/agence/dashboard', label: 'Vue d\'ensemble' },
    { to: '/agence/dossiers', label: 'Dossiers' },
    { to: '/agence/pelerins', label: 'Pèlerins' },
    { to: '/agence/notifications', label: 'Notifications' },
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
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const links = NAV_LINKS_BY_ROLE[user?.role] ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface md:block">
          <div className="flex h-16 items-center border-b border-border px-6">
            <span className="font-display text-lg font-semibold text-primary">Hajj</span>
          </div>
          <nav className="flex flex-col gap-1 p-4">
            {links.map((link) => (
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
              <button
                onClick={() => navigate(`/${user?.role}/notifications`)}
                aria-label="Notifications"
                className="relative text-text-secondary hover:text-text-primary"
              >
                <span className="text-lg" aria-hidden="true">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 font-mono text-[10px] font-semibold text-[#FAF7F0]">
                    {unreadCount}
                  </span>
                )}
              </button>
              <span className="font-body text-sm text-text-secondary">
                {user?.prenom} {user?.nom}
              </span>
              <button
                onClick={logout}
                className="font-body text-sm font-medium text-text-secondary hover:text-danger"
              >
                Déconnexion
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
