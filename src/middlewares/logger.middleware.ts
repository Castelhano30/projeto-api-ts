import { NextFunction, Request, Response } from "express";

export function loggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    // eslint-disable-next-line no-console
    console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`);
  });

  next();
}
