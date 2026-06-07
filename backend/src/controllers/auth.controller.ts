import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { changeOwnPassword, changeRequiredPassword, getAuthenticatedUser, login, updateOwnProfile } from '../services/auth.service';

export async function loginController(request: Request, response: Response) {
  const result = await login({
    username: request.body?.username,
    password: request.body?.password,
  });

  response.status(200).json(result);
}

export async function meController(request: Request, response: Response) {
  if (!request.user) {
    throw new AppError('Usuario no autenticado.', 401);
  }

  const user = await getAuthenticatedUser(request.user.id);

  response.status(200).json({ user });
}

export async function updateProfileController(request: Request, response: Response) {
  if (!request.user) {
    throw new AppError('Usuario no autenticado.', 401);
  }

  const user = await updateOwnProfile(request.user.id, {
    nombre: request.body?.nombre,
    email: request.body?.email,
    fotoPerfil: request.body?.fotoPerfil,
  });

  response.status(200).json({ user });
}

export async function changePasswordController(request: Request, response: Response) {
  if (!request.user) {
    throw new AppError('Usuario no autenticado.', 401);
  }

  const user = await changeOwnPassword(request.user.id, {
    currentPassword: request.body?.currentPassword,
    newPassword: request.body?.newPassword,
    confirmPassword: request.body?.confirmPassword,
  });

  response.status(200).json({ user });
}

export async function changeRequiredPasswordController(request: Request, response: Response) {
  if (!request.user) {
    throw new AppError('Usuario no autenticado.', 401);
  }

  const user = await changeRequiredPassword(request.user.id, {
    newPassword: request.body?.newPassword,
    confirmPassword: request.body?.confirmPassword,
  });

  response.status(200).json({ user });
}
