import type { Request, Response } from 'express';
import {
  createNewSanitaryRule,
  listSanitaryRules,
  updateExistingSanitaryRule,
} from '../services/vacunacion.service';

export async function listSanitaryRulesController(_request: Request, response: Response) {
  const reglas = await listSanitaryRules();

  response.status(200).json({ reglas });
}

export async function createSanitaryRuleController(request: Request, response: Response) {
  const regla = await createNewSanitaryRule(request.body ?? {});

  response.status(201).json({ regla });
}

export async function updateSanitaryRuleController(request: Request, response: Response) {
  const regla = await updateExistingSanitaryRule(String(request.params.id), request.body ?? {});

  response.status(200).json({ regla });
}
