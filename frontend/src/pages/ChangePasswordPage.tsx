import { FormEvent, useState } from 'react';
import { Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { paths } from '../routes/paths';
import { ApiError } from '../services/apiClient';
import { changeRequiredPassword } from '../services/authService';
import type { AuthUser } from '../types/auth';

interface ChangePasswordPageProps {
  authToken: string | null;
  onUnauthorized: () => void;
  onUserUpdated: (user: AuthUser) => void;
}

export function ChangePasswordPage({ authToken, onUnauthorized, onUserUpdated }: ChangePasswordPageProps) {
  const navigate = useNavigate();
  const [values, setValues] = useState({ newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    if (values.newPassword !== values.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (values.newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      onUserUpdated(await changeRequiredPassword(authToken, values));
      navigate(paths.dashboard, { replace: true });
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.statusCode === 401) {
        onUnauthorized();
        return;
      }
      setError(requestError instanceof Error ? requestError.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="force-password-shell">
      <section className="panel force-password-modal">
        <div className="panel-header">
          <div>
            <h2>Cambiar contraseña</h2>
            <p>Para continuar, ingresá una contraseña personal.</p>
          </div>
        </div>
        {error && <div className="form-error">{error}</div>}
        <form className="user-form force-password-form" onSubmit={handleSubmit}>
          <label>
            <span>Nueva contraseña</span>
            <input
              type="password"
              value={values.newPassword}
              onChange={(event) => setValues({ ...values, newPassword: event.target.value })}
              required
              minLength={8}
            />
          </label>
          <label>
            <span>Confirmar nueva contraseña</span>
            <input
              type="password"
              value={values.confirmPassword}
              onChange={(event) => setValues({ ...values, confirmPassword: event.target.value })}
              required
              minLength={8}
            />
          </label>
          <div className="modal-actions force-password-actions">
            <button type="submit" className="primary-button" disabled={isSaving}>
              <Save size={18} />
              {isSaving ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
