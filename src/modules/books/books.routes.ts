import { Router } from "express";
import { BooksController } from "./books.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { roleMiddleware } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { bookIdParamSchema, createBookSchema, updateBookSchema } from "./books.dto";

export function buildBooksRoutes(booksController: BooksController): Router {
  const router = Router();

  router.use(authMiddleware);

  /**
   * @openapi
   * /books:
   *   post:
   *     summary: Cria um novo livro (somente ADMIN)
   *     tags: [Books]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [titulo, autor, isbn, quantidadeTotal]
   *             properties:
   *               titulo: { type: string, example: "Dom Casmurro" }
   *               autor: { type: string, example: "Machado de Assis" }
   *               isbn: { type: string, example: "978-85-359-0277-5" }
   *               quantidadeTotal: { type: integer, example: 3 }
   *     responses:
   *       201:
   *         description: Livro criado
   *       403:
   *         description: Acesso negado
   *   get:
   *     summary: Lista todos os livros
   *     tags: [Books]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lista de livros
   */
  router.post("/", roleMiddleware("ADMIN"), validate(createBookSchema), booksController.create);
  router.get("/", booksController.list);

  /**
   * @openapi
   * /books/{id}:
   *   get:
   *     summary: Busca um livro por ID
   *     tags: [Books]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Livro encontrado
   *       404:
   *         description: Livro nao encontrado
   *   put:
   *     summary: Atualiza um livro (somente ADMIN)
   *     tags: [Books]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Livro atualizado
   *       403:
   *         description: Acesso negado
   *   delete:
   *     summary: Remove um livro (somente ADMIN)
   *     tags: [Books]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       204:
   *         description: Livro removido
   *       403:
   *         description: Acesso negado
   */
  router.get("/:id", validate(bookIdParamSchema), booksController.getById);
  router.put(
    "/:id",
    roleMiddleware("ADMIN"),
    validate(updateBookSchema),
    booksController.update
  );
  router.delete(
    "/:id",
    roleMiddleware("ADMIN"),
    validate(bookIdParamSchema),
    booksController.delete
  );

  return router;
}
