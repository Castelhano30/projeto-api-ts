import { Request } from "express";
import { NextFunction, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../utils/app-error";
import { AuthenticatedUser } from "./auth.middleware";
import { UserRole } from "../modules/users/users.types";

/** Lanca UnauthorizedError se a requisicao nao estiver autenticada; retorna o usuario autenticado. */
export function requireAuthenticatedUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw new UnauthorizedError("Nao autenticado");
  }
  return req.user;
}

export function roleMiddleware(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = requireAuthenticatedUser(req);

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError("Papel de usuario nao autorizado para esta acao");
    }

    next();
  };
}
