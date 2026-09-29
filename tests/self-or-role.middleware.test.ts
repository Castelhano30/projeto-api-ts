import { describe, expect, it, vi } from "vitest";
import { Request, Response } from "express";
import { selfOrRoleMiddleware } from "../src/middlewares/self-or-role.middleware";
import { ForbiddenError, UnauthorizedError } from "../src/utils/app-error";
import { AuthenticatedUser } from "../src/middlewares/auth.middleware";

function buildReq(user: AuthenticatedUser | undefined, paramId: string): Request {
  return { user, params: { id: paramId } } as unknown as Request;
}

describe("selfOrRoleMiddleware", () => {
  const middleware = selfOrRoleMiddleware("ADMIN");

  it("lanca UnauthorizedError quando nao ha usuario autenticado", () => {
    const req = buildReq(undefined, "507f1f77bcf86cd799439011");
    const next = vi.fn();

    expect(() => middleware(req, {} as Response, next)).toThrow(UnauthorizedError);
    expect(next).not.toHaveBeenCalled();
  });

  it("permite acesso quando o usuario tem o papel permitido, mesmo nao sendo o dono", () => {
    const req = buildReq({ id: "admin-id", role: "ADMIN" }, "507f1f77bcf86cd799439011");
    const next = vi.fn();

    middleware(req, {} as Response, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("permite acesso quando o usuario e o dono do recurso, mesmo sem o papel permitido", () => {
    const req = buildReq({ id: "507f1f77bcf86cd799439011", role: "MEMBER" }, "507f1f77bcf86cd799439011");
    const next = vi.fn();

    middleware(req, {} as Response, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("lanca ForbiddenError quando o usuario nao e dono nem tem o papel permitido", () => {
    const req = buildReq({ id: "outro-id", role: "MEMBER" }, "507f1f77bcf86cd799439011");
    const next = vi.fn();

    expect(() => middleware(req, {} as Response, next)).toThrow(ForbiddenError);
    expect(next).not.toHaveBeenCalled();
  });

  it("permite acesso quando o id na URL e o mesmo id do usuario, ignorando caixa", () => {
    const req = buildReq(
      { id: "507f1f77bcf86cd799439011", role: "MEMBER" },
      "507F1F77BCF86CD799439011"
    );
    const next = vi.fn();

    middleware(req, {} as Response, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
