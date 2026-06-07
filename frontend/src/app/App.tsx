import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { AgendaPage } from '../pages/AgendaPage';
import { AnimalFichaPage } from '../pages/AnimalFichaPage';
import { EventsPage } from '../pages/EventsPage';
import { FeedPage } from '../pages/FeedPage';
import { ChangePasswordPage } from '../pages/ChangePasswordPage';
import { HerdPage } from '../pages/HerdPage';
import { LoginPage } from '../pages/LoginPage';
import { ProfilePage } from '../pages/ProfilePage';
import { SettingsPage } from '../pages/SettingsPage';
import { SalesPage } from '../pages/SalesPage';
import { VaccinationPage } from '../pages/VaccinationPage';
import { paths } from '../routes/paths';
import { clearAuthToken, getCurrentUser, getStoredAuthToken, saveAuthToken } from '../services/authService';
import type { AuthUser } from '../types/auth';
import { ProduccionView } from '../views/ProduccionView';

function AccessDeniedPage() {
  return (
    <div className="placeholder-page">
      <h2>Acceso restringido</h2>
      <p>No tenés permisos para acceder a esta sección.</p>
    </div>
  );
}

export function App() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBootstrappingAuth, setIsBootstrappingAuth] = useState(true);

  useEffect(() => {
    const storedToken = getStoredAuthToken();

    if (!storedToken) {
      setIsBootstrappingAuth(false);
      return;
    }

    getCurrentUser(storedToken)
      .then((currentUser) => {
        setUser(currentUser);
        setAuthToken(storedToken);
      })
      .catch(() => {
        clearAuthToken();
        setUser(null);
        setAuthToken(null);
      })
      .finally(() => {
        setIsBootstrappingAuth(false);
      });
  }, []);

  function handleLogin(nextUser: AuthUser, token: string) {
    saveAuthToken(token);
    setUser(nextUser);
    setAuthToken(token);
  }

  function handleLogout() {
    clearAuthToken();
    setUser(null);
    setAuthToken(null);
  }

  function handleUserUpdated(nextUser: AuthUser) {
    setUser(nextUser);
  }

  if (isBootstrappingAuth) {
    return <div className="auth-loading">Cargando sesión...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path={paths.login}
          element={
            authToken && user ? (
              <Navigate to={paths.dashboard} replace />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          }
        />

        <Route
          element={
            authToken && user ? (
              user.mustChangePassword ? (
                <Navigate to={paths.changePassword} replace />
              ) : (
                <MainLayout user={user} authToken={authToken} onLogout={handleLogout} />
              )
            ) : (
              <Navigate to={paths.login} replace />
            )
          }
        >
          <Route
            path={paths.dashboard}
            element={
              <DashboardPage
                authToken={authToken}
                currentUser={user}
                onUnauthorized={handleLogout}
              />
            }
          />
          <Route
            path={paths.herd}
            element={
              <HerdPage
                authToken={authToken}
                currentUser={user}
                onUnauthorized={handleLogout}
              />
            }
          />
          <Route
            path={paths.animalFicha}
            element={<AnimalFichaPage authToken={authToken} onUnauthorized={handleLogout} />}
          />
          <Route
            path={paths.events}
            element={<EventsPage authToken={authToken} onUnauthorized={handleLogout} />}
          />
          <Route
            path={paths.agenda}
            element={<AgendaPage authToken={authToken} currentUser={user} onUnauthorized={handleLogout} />}
          />
          <Route
            path={paths.clients}
            element={<Navigate to={paths.sales} replace />}
          />
          <Route
            path={paths.sales}
            element={user?.role === 'ADMIN' ? <SalesPage authToken={authToken} currentUser={user} onUnauthorized={handleLogout} /> : <AccessDeniedPage />}
          />
          <Route
            path={paths.feed}
            element={<FeedPage authToken={authToken} currentUser={user} onUnauthorized={handleLogout} />}
          />
          <Route
            path={paths.production}
            element={<ProduccionView authToken={authToken} currentUser={user} onUnauthorized={handleLogout} />}
          />
          <Route
            path={paths.vaccination}
            element={<VaccinationPage authToken={authToken} currentUser={user} onUnauthorized={handleLogout} />}
          />
          <Route
            path={paths.settings}
            element={user?.role === 'ADMIN' ? <Navigate to={paths.users} replace /> : <AccessDeniedPage />}
          />
          <Route
            path={paths.users}
            element={
              user?.role === 'ADMIN' ? <SettingsPage
                authToken={authToken}
                currentUser={user}
                onUnauthorized={handleLogout}
              /> : <AccessDeniedPage />
            }
          />
          <Route
            path={paths.profile}
            element={<ProfilePage authToken={authToken} currentUser={user!} onUnauthorized={handleLogout} onUserUpdated={handleUserUpdated} />}
          />
        </Route>

        <Route
          path={paths.changePassword}
          element={
            authToken && user ? (
              <ChangePasswordPage authToken={authToken} onUnauthorized={handleLogout} onUserUpdated={handleUserUpdated} />
            ) : (
              <Navigate to={paths.login} replace />
            )
          }
        />

        <Route path="*" element={<Navigate to={authToken ? paths.dashboard : paths.login} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
