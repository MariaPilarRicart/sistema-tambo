import { FormEvent, useState } from 'react';
import { AlertCircle, Lock, LogIn, User } from 'lucide-react';
import { login } from '../services/authService';
import type { AuthUser } from '../types/auth';
import { CowIcon } from '../components/ui/CowIcon';

interface LoginPageProps {
  onLogin: (user: AuthUser, token: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await login({ username, password });
      onLogin(response.user, response.token);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No se pudo iniciar sesion.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="login-mark">
            <CowIcon size={40} />
          </div>
          <h1>
            AgriDairy<span>Pro</span>
          </h1>
          <p>Control de Acceso</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>Usuario</span>
            <div className="input-with-icon">
              <User size={18} />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="admin"
                autoComplete="username"
              />
            </div>
          </label>

          <label>
            <span>Contrasena</span>
            <div className="input-with-icon">
              <Lock size={18} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="admin"
                autoComplete="current-password"
              />
            </div>
          </label>

          {error && (
            <div className="form-error" role="alert">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            <LogIn size={20} />
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  );
}
