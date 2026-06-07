import type { Request, Response } from 'express';
import { createNewUser, deactivateExistingUser, listUsers, resetExistingUserPassword, updateExistingUser } from '../services/users.service';

export async function listUsersController(_request: Request, response: Response) {
  const users = await listUsers();

  response.status(200).json({ users });
}

export async function createUserController(request: Request, response: Response) {
  const user = await createNewUser(request.body);

  response.status(201).json({ user });
}

export async function updateUserController(request: Request, response: Response) {
  const user = await updateExistingUser(String(request.params.id), request.body);

  response.status(200).json({ user });
}

export async function deleteUserController(request: Request, response: Response) {
  const user = await deactivateExistingUser(String(request.params.id));

  response.status(200).json({ user });
}

export async function resetUserPasswordController(request: Request, response: Response) {
  const user = await resetExistingUserPassword(String(request.params.id));

  response.status(200).json({ user });
}
