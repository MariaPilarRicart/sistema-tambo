import type { Request, Response } from 'express';
import { getDashboardResumen } from '../services/dashboard.service';

export async function getDashboardResumenController(_request: Request, response: Response) {
  const resumen = await getDashboardResumen();

  response.status(200).json({ resumen });
}
