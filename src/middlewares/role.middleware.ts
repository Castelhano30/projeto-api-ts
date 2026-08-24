import { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../utils/app-error";
import { UserRole } from "../modules/users/users.types";

export function roleMiddleware(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError("Nao autenticado");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError("Papel de usuario nao autorizado para esta acao");
    }

    next();
  };
}
