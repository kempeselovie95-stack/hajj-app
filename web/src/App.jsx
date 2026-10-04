import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROLES } from '@hajj/shared';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import AppShell from './components/layout/AppShell.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import PelerinDashboardPage from './pages/pelerin/PelerinDashboardPage.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AdminDossiersListPage from './pages/admin/AdminDossiersListPage.jsx';
import AgenceDashboardPage from './pages/agence/AgenceDashboardPage.jsx';
import DossiersListPage from './pages/agence/DossiersListPage.jsx';
import DossierDetailPage from './pages/agence/DossierDetailPage.jsx';
import NotificationsPage from './pages/notifications/NotificationsPage.jsx';
import AgenciesPage from './pages/admin/AgenciesPage.jsx';
import PilgrimsPage from './pages/agence/PilgrimsPage.jsx';
import EncadreurDashboardPage from './pages/encadreur/EncadreurDashboardPage.jsx';
import GroupChatPage from './pages/encadreur/GroupChatPage.jsx';
import EncadreursPage from './pages/admin/EncadreursPage.jsx';
import OperationsPage from './pages/admin/OperationsPage.jsx';
import PaymentManagementPage from './pages/payments/PaymentManagementPage.jsx';
import OrganisationsPage from './pages/admin/OrganisationsPage.jsx';
import DocumentsManagementPage from './pages/documents/DocumentsManagementPage.jsx';
import GroupsManagementPage from './pages/groups/GroupsManagementPage.jsx';
import ProfilePage from './pages/account/ProfilePage.jsx';
import { LanguageProvider } from './contexts/LanguageContext.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Espace pèlerin */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.PELERIN]} />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<PelerinDashboardPage />} />
          <Route path="/pelerin/notifications" element={<NotificationsPage />} />
          <Route path="/pelerin/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Espace admin */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
        <Route element={<AppShell />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/agences" element={<AgenciesPage />} />
          <Route path="/admin/encadreurs" element={<EncadreursPage />} />
          <Route path="/admin/pelerins" element={<PilgrimsPage />} />
          <Route path="/admin/dossiers" element={<AdminDossiersListPage />} />
          <Route path="/admin/paiements" element={<PaymentManagementPage />} />
          <Route path="/admin/groupes" element={<GroupsManagementPage />} />
          <Route path="/admin/documents" element={<DocumentsManagementPage />} />
          <Route path="/admin/voyages" element={<MenuModulePage title="Voyages" />} />
          <Route path="/admin/presence" element={<MenuModulePage title="QR & Présence" />} />
          <Route path="/admin/operations" element={<OperationsPage />} />
          <Route path="/admin/statistiques" element={<AdminDashboardPage />} />
          <Route path="/admin/organisations" element={<OrganisationsPage />} />
          <Route path="/admin/parametres" element={<ProfilePage />} />
          <Route path="/admin/notifications" element={<NotificationsPage />} />
          <Route path="/admin/profile" element={<ProfilePage />} />
          {/* TODO(Phase 3+) : /admin/agences */}
        </Route>
      </Route>

      {/* Espace agence */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.AGENCE]} />}>
        <Route element={<AppShell />}>
          <Route path="/agence/dashboard" element={<AgenceDashboardPage />} />
          <Route path="/agence/dossiers" element={<DossiersListPage />} />
          <Route path="/agence/dossiers/:id" element={<DossierDetailPage />} />
          <Route path="/agence/pelerins" element={<PilgrimsPage />} />
          <Route path="/agence/paiements" element={<PaymentManagementPage />} />
          <Route path="/agence/groupes" element={<GroupsManagementPage />} />
          <Route path="/agence/documents" element={<DocumentsManagementPage />} />
          <Route path="/agence/guides" element={<MenuModulePage title="Guides" />} />
          <Route path="/agence/voyages" element={<MenuModulePage title="Voyages" />} />
          <Route path="/agence/presence" element={<MenuModulePage title="QR & Présence" />} />
          <Route path="/agence/notifications" element={<NotificationsPage />} />
          <Route path="/agence/profile" element={<ProfilePage />} />
          {/* TODO(Phase 3+) : /agence/pelerins */}
        </Route>
      </Route>

      {/* Espace encadreur */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.ENCADREUR]} />}>
        <Route element={<AppShell />}>
          <Route path="/encadreur/dashboard" element={<EncadreurDashboardPage />} />
          <Route path="/encadreur/groupes" element={<EncadreurDashboardPage />} />
          <Route path="/encadreur/groupes/:id/chat" element={<GroupChatPage />} />
          <Route path="/encadreur/notifications" element={<NotificationsPage />} />
          <Route path="/encadreur/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

function MenuModulePage({ title }) {
  return (
    <section className="mx-auto max-w-4xl py-8">
      <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">Ce module est en préparation.</p>
    </section>
  );
}

/** Redirige vers l'espace correspondant au rôle, ou vers /login si déconnecté */
function RootRedirect() {
  const { isAuthenticated, isLoading, homeRoute } = useAuth();
  if (isLoading) return null;
  return <Navigate to={isAuthenticated ? homeRoute : '/login'} replace />;
}
