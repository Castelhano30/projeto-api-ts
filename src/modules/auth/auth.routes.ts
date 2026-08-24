import { Router } from "express";
import { AuthController } from "./auth.controller";
import { validate } from "../../middlewares/validate.middleware";
import { loginSchema, registerSchema } from "./auth.dto";
import { asyncHandler } from "../../utils/async-handler";

export function buildAuthRoutes(authController: AuthController): Router {
  const router = Router();

  /**
   * @openapi
   * /auth/register:
   *   post:
   *     summary: Cria um novo usuario
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [nome, email, senha]
   *             properties:
   *               nome: { type: string, example: "Maria Silva" }
   *               email: { type: string, example: "maria@example.com" }
   *               senha: { type: string, example: "senha123" }
   *               papel: { type: string, enum: [ADMIN, MEMBER], example: "MEMBER" }
   *     responses:
   *       201:
   *         description: Usuario criado com sucesso
   *       409:
   *         description: Email ja cadastrado
   */
  router.post("/register", validate(registerSchema), asyncHandler(authController.register));

  /**
   * @openapi
   * /auth/login:
   *   post:
   *     summary: Autentica um usuario e retorna um token JWT
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, senha]
   *             properties:
   *               email: { type: string, example: "maria@example.com" }
   *               senha: { type: string, example: "senha123" }
   *     responses:
   *       200:
   *         description: Login efetuado com sucesso, retorna token JWT
   *       401:
   *         description: Credenciais invalidas
   */
  router.post("/login", validate(loginSchema), asyncHandler(authController.login));

  return router;
}
