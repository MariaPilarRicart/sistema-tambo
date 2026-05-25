import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { getAuthenticatedUser, login } from '../services/auth.service';

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
