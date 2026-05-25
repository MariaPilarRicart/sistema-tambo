import type { Request, Response } from 'express';
import {
  createNewAnimal,
  deactivateExistingAnimal,
  getAnimal,
  listAnimales,
  updateExistingAnimal,
} from '../services/animales.service';

export async function listAnimalesController(request: Request, response: Response) {
  const animales = await listAnimales(request.query);

  response.status(200).json({ animales });
}

export async function getAnimalController(request: Request, response: Response) {
  const animal = await getAnimal(String(request.params.id));

  response.status(200).json({ animal });
}

export async function createAnimalController(request: Request, response: Response) {
  const animal = await createNewAnimal(request.body);

  response.status(201).json({ animal });
}

export async function updateAnimalController(request: Request, response: Response) {
  const animal = await updateExistingAnimal(String(request.params.id), request.body);

  response.status(200).json({ animal });
}

export async function deleteAnimalController(request: Request, response: Response) {
  const animal = await deactivateExistingAnimal(String(request.params.id), request.body ?? {});

  response.status(200).json({ animal });
}
