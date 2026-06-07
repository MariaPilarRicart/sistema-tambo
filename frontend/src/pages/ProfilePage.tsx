import { ChangeEvent, FormEvent, useMemo, useRef, useState } from 'react';
import { Camera, Save, X } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { changePassword, updateProfile } from '../services/authService';
import type { AuthUser } from '../types/auth';

interface ProfilePageProps {
  authToken: string | null;
  currentUser: AuthUser;
  onUnauthorized: () => void;
  onUserUpdated: (user: AuthUser) => void;
}

type ProfileFormValues = {
  nombre: string;
  email: string;
  fotoPerfil: string | null;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

function formatDate(value: string | null) {
  if (!value) return 'No disponible';
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ProfilePage({ authToken, currentUser, onUnauthorized, onUserUpdated }: ProfilePageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [values, setValues] = useState<ProfileFormValues>({
    nombre: currentUser.name,
    email: currentUser.email ?? '',
    fotoPerfil: currentUser.profilePhoto,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const initials = useMemo(() => getInitials(currentUser.name), [currentUser.name]);

  function openModal() {
    setValues({
      nombre: currentUser.name,
      email: currentUser.email ?? '',
      fotoPerfil: currentUser.profilePhoto,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setFileName('');
    setError('');
    setIsModalOpen(true);
  }

  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('La foto debe ser JPG, PNG o WEBP.');
      return;
    }

    if (file.size > 750_000) {
      setError('La foto no puede superar 750 KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setValues((current) => ({ ...current, fotoPerfil: String(reader.result) }));
      setFileName(file.name);
      setError('');
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();

    if ((values.newPassword || values.confirmPassword) && values.newPassword !== values.confirmPassword) {
      setError('La nueva contraseña y la confirmación no coinciden.');
      return;
    }

    if (values.newPassword && values.newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (values.newPassword && !values.currentPassword) {
      setError('Ingresá la contraseña actual para cambiar la contraseña.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      if (values.newPassword) {
        await changePassword(authToken, {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword,
        });
      }

      const updatedUser = await updateProfile(authToken, {
        nombre: values.nombre,
        email: values.email.trim() || null,
        fotoPerfil: values.fotoPerfil,
      });

      onUserUpdated(updatedUser);
      setIsModalOpen(false);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.statusCode === 401) {
        onUnauthorized();
        return;
      }
      setError(requestError instanceof Error ? requestError.message : 'No se pudo actualizar el perfil.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="profile-page">
      <section className="panel profile-card">
        <div className="panel-header profile-card-header">
          <div>
            <h2>Mi perfil</h2>
            <p>Datos de la cuenta con la que ingresaste al sistema.</p>
          </div>
          <button type="button" className="primary-button compact-button" onClick={openModal}>
            Actualizar datos
          </button>
        </div>

        <div className="profile-summary">
          <div className="profile-avatar-large">
            {currentUser.profilePhoto ? <img src={currentUser.profilePhoto} alt="" /> : initials}
          </div>
          <div>
            <h3>{currentUser.name}</h3>
            <p>{currentUser.username}</p>
          </div>
        </div>

        <dl className="profile-readonly-grid">
          <div>
            <dt>Nombre</dt>
            <dd>{currentUser.name}</dd>
          </div>
          <div>
            <dt>Usuario</dt>
            <dd>{currentUser.username}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{currentUser.email || 'Sin email registrado'}</dd>
          </div>
          <div>
            <dt>Rol</dt>
            <dd>{currentUser.role === 'ADMIN' ? 'Administrador' : 'Empleado'}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>{currentUser.active ? 'ACTIVO' : 'INACTIVO'}</dd>
          </div>
          <div>
            <dt>Fecha de creación</dt>
            <dd>{formatDate(currentUser.createdAt)}</dd>
          </div>
        </dl>
      </section>

      {isModalOpen && (
        <div className="modal-backdrop">
          <section className="panel modal-panel profile-update-modal">
            <div className="panel-header">
              <div>
                <h2>Actualizar perfil</h2>
                <p>El rol y el estado se administran desde Usuarios.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setIsModalOpen(false)} aria-label="Cerrar actualización de perfil">
                <X size={18} />
              </button>
            </div>

            {error && <div className="form-error">{error}</div>}

            <form className="user-form profile-update-form" onSubmit={handleSubmit}>
              <label>
                <span>Nombre</span>
                <input value={values.nombre} onChange={(event) => setValues({ ...values, nombre: event.target.value })} required />
              </label>
              <label>
                <span>Email</span>
                <input type="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} />
              </label>

              <div className="profile-photo-field">
                <span>Foto de perfil</span>
                <div className="profile-photo-picker">
                  <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}>
                    <Camera size={16} />
                    Seleccionar imagen
                  </button>
                  <small>{fileName || 'Ningún archivo seleccionado'}</small>
                </div>
                <input
                  ref={fileInputRef}
                  className="hidden-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhoto}
                />
                {values.fotoPerfil && <img className="profile-photo-preview" src={values.fotoPerfil} alt="Preview de foto de perfil" />}
              </div>

              <div className="profile-form-section">
                <h3>Cambiar contraseña</h3>
                <p>Completá estos campos solo si querés modificar tu contraseña.</p>
              </div>

              <label>
                <span>Contraseña actual</span>
                <input type="password" value={values.currentPassword} onChange={(event) => setValues({ ...values, currentPassword: event.target.value })} />
              </label>
              <label>
                <span>Nueva contraseña</span>
                <input type="password" value={values.newPassword} onChange={(event) => setValues({ ...values, newPassword: event.target.value })} minLength={8} />
              </label>
              <label>
                <span>Confirmar nueva contraseña</span>
                <input type="password" value={values.confirmPassword} onChange={(event) => setValues({ ...values, confirmPassword: event.target.value })} minLength={8} />
              </label>

              <div className="modal-actions profile-update-actions">
                <button type="button" className="secondary-button" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="primary-button" disabled={isSaving}>
                  <Save size={18} />
                  {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
