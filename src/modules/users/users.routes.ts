import { Router } from "express";
import { UsersController } from "./users.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { roleMiddleware } from "../../middlewares/role.middleware";
import { asyncHandler } from "../../utils/async-handler";

export function buildUsersRoutes(usersController: UsersController): Router {
  const router = Router();

  /**
   * @openapi
   * /users:
   *   get:
   *     summary: Lista todos os usuarios (somente ADMIN)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lista de usuarios
   *       403:
   *         description: Acesso negado
   */
  router.get("/", authMiddleware, roleMiddleware("ADMIN"), asyncHandler(usersController.list));

  return router;
}
