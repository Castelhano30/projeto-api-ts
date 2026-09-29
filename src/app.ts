import express, { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger";
import { loggerMiddleware } from "./middlewares/logger.middleware";
import { errorMiddleware } from "./middlewares/error.middleware";

import { UsersRepository } from "./modules/users/users.repository";
import { UsersService } from "./modules/users/users.service";
import { UsersController } from "./modules/users/users.controller";
import { buildUsersRoutes } from "./modules/users/users.routes";

import { AuthService } from "./modules/auth/auth.service";
import { AuthController } from "./modules/auth/auth.controller";
import { buildAuthRoutes } from "./modules/auth/auth.routes";

import { BooksRepository } from "./modules/books/books.repository";
import { BooksService } from "./modules/books/books.service";
import { BooksController } from "./modules/books/books.controller";
import { buildBooksRoutes } from "./modules/books/books.routes";

import { LoansRepository } from "./modules/loans/loans.repository";
import { LoansService } from "./modules/loans/loans.service";
import { LoansController } from "./modules/loans/loans.controller";
import { buildLoansRoutes } from "./modules/loans/loans.routes";

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(loggerMiddleware);

  // Dependency injection manual: repository -> service -> controller
  const usersRepository = new UsersRepository();

  const booksRepository = new BooksRepository();
  const booksService = new BooksService(booksRepository);
  const booksController = new BooksController(booksService);

  const loansRepository = new LoansRepository();
  const loansService = new LoansService(loansRepository, booksService);
  const loansController = new LoansController(loansService);

  const usersService = new UsersService(usersRepository, loansService);
  const usersController = new UsersController(usersService);

  const authService = new AuthService(usersService);
  const authController = new AuthController(authService);

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use("/auth", buildAuthRoutes(authController));
  app.use("/users", buildUsersRoutes(usersController));
  app.use("/books", buildBooksRoutes(booksController));
  app.use("/loans", buildLoansRoutes(loansController));

  app.use(errorMiddleware);

  return app;
}
