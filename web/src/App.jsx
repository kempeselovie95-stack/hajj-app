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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
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
        </Route>
      </Route>

      {/* Espace admin */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
        <Route element={<AppShell />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/dossiers" element={<AdminDossiersListPage />} />
          <Route path="/admin/notifications" element={<NotificationsPage />} />
          {/* TODO(Phase 3+) : /admin/agences */}
        </Route>
      </Route>

      {/* Espace agence */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.AGENCE]} />}>
        <Route element={<AppShell />}>
          <Route path="/agence/dashboard" element={<AgenceDashboardPage />} />
          <Route path="/agence/dossiers" element={<DossiersListPage />} />
          <Route path="/agence/dossiers/:id" element={<DossierDetailPage />} />
          <Route path="/agence/notifications" element={<NotificationsPage />} />
          {/* TODO(Phase 3+) : /agence/pelerins */}
        </Route>
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

/** Redirige vers l'espace correspondant au rôle, ou vers /login si déconnecté */
function RootRedirect() {
  const { isAuthenticated, isLoading, homeRoute } = useAuth();
  if (isLoading) return null;
  return <Navigate to={isAuthenticated ? homeRoute : '/login'} replace />;
}
