import { Router } from "express";
import { UsersController } from "./users.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { roleMiddleware } from "../../middlewares/role.middleware";
import { selfOrRoleMiddleware } from "../../middlewares/self-or-role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { updateUserSchema, userIdParamSchema } from "./users.dto";
import { asyncHandler } from "../../utils/async-handler";

export function buildUsersRoutes(usersController: UsersController): Router {
  const router = Router();

  router.use(authMiddleware);

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
  router.get("/", roleMiddleware("ADMIN"), asyncHandler(usersController.list));

  /**
   * @openapi
   * /users/{id}:
   *   put:
   *     summary: Atualiza um usuario (ADMIN ou o proprio usuario)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Usuario atualizado
   *       400:
   *         description: Dados invalidos, ou tentativa de alterar papel sem ser ADMIN
   *       403:
   *         description: Acesso negado
   *   patch:
   *     summary: Atualiza um usuario (ADMIN ou o proprio usuario)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Usuario atualizado
   *       400:
   *         description: Dados invalidos, ou tentativa de alterar papel sem ser ADMIN
   *       403:
   *         description: Acesso negado
   *   delete:
   *     summary: Remove um usuario (ADMIN ou o proprio usuario)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       204:
   *         description: Usuario removido
   *       403:
   *         description: Acesso negado
   */
  router.put(
    "/:id",
    selfOrRoleMiddleware("ADMIN"),
    validate(updateUserSchema),
    asyncHandler(usersController.update)
  );
  router.patch(
    "/:id",
    selfOrRoleMiddleware("ADMIN"),
    validate(updateUserSchema),
    asyncHandler(usersController.update)
  );
  router.delete(
    "/:id",
    selfOrRoleMiddleware("ADMIN"),
    validate(userIdParamSchema),
    asyncHandler(usersController.delete)
  );

  return router;
}
