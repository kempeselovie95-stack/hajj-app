import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

/**
 * Protège un sous-arbre de routes. Deux niveaux de contrôle :
 *  1. Authentification : redirige vers /login si non connecté.
 *  2. Autorisation (optionnelle) : si `allowedRoles` est fourni et que le
 *     rôle de l'utilisateur n'y figure pas, redirige vers son espace normal
 *     plutôt que d'afficher une page blanche ou une 403 brute.
 *
 * @param {{ allowedRoles?: string[] }} props
 */
export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, isLoading, user, homeRoute } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Évite un flash de redirection pendant la vérification de session
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-body text-text-secondary">Chargement…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={homeRoute} replace />;
  }

  return <Outlet />;
}
