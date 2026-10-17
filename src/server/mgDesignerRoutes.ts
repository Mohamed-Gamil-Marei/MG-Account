import type { Express, Request, Response } from 'express';

export function setupMgDesignerRoutes(app: Express, _dataDir?: string): void {
  app.get('/api/mg-designer/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'MG Designer Licensing Engine' });
  });
}
