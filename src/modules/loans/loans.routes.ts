import { Router } from "express";
import { LoansController } from "./loans.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createLoanSchema, loanIdParamSchema } from "./loans.dto";

export function buildLoansRoutes(loansController: LoansController): Router {
  const router = Router();

  router.use(authMiddleware);

  /**
   * @openapi
   * /loans:
   *   post:
   *     summary: Cria um novo emprestimo
   *     tags: [Loans]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [livroId]
   *             properties:
   *               livroId: { type: string, example: "b1f2c3d4-..." }
   *               diasParaDevolucao: { type: integer, example: 14 }
   *     responses:
   *       201:
   *         description: Emprestimo criado
   *       409:
   *         description: Sem exemplares disponiveis
   *   get:
   *     summary: Lista emprestimos (ADMIN ve todos, MEMBER ve os seus)
   *     tags: [Loans]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lista de emprestimos
   */
  router.post("/", validate(createLoanSchema), loansController.create);
  router.get("/", loansController.list);

  /**
   * @openapi
   * /loans/{id}:
   *   get:
   *     summary: Busca um emprestimo por ID
   *     tags: [Loans]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Emprestimo encontrado
   *       404:
   *         description: Emprestimo nao encontrado
   */
  router.get("/:id", validate(loanIdParamSchema), loansController.getById);

  /**
   * @openapi
   * /loans/{id}/return:
   *   patch:
   *     summary: Registra a devolucao de um emprestimo
   *     tags: [Loans]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Emprestimo devolvido
   *       409:
   *         description: Emprestimo ja devolvido
   */
  router.patch("/:id/return", validate(loanIdParamSchema), loansController.returnLoan);

  return router;
}
