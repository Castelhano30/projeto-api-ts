import { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../utils/app-error";
import { requireAuthenticatedUser } from "./role.middleware";
import { UserRole } from "../modules/users/users.types";

/**
 * Autoriza a requisicao quando quem chama tem um dos papeis permitidos OU
 * e o proprio dono do recurso (req.params.id === req.user.id, comparado
 * sem diferenciar caixa, ja que ObjectId hexadecimal aceita ambas).
 */
export function selfOrRoleMiddleware(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = requireAuthenticatedUser(req);

    const isOwner = user.id.toLowerCase() === req.params.id.toLowerCase();
    const hasAllowedRole = allowedRoles.includes(user.role);

    if (!isOwner && !hasAllowedRole) {
      throw new ForbiddenError("Acesso negado");
    }

    next();
  };
}
