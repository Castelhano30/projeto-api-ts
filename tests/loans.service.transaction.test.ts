import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { BooksRepository } from "../src/modules/books/books.repository";
import { BooksService } from "../src/modules/books/books.service";
import { LoansRepository } from "../src/modules/loans/loans.repository";
import { LoansService } from "../src/modules/loans/loans.service";
import { BookModel } from "../src/modules/books/books.schema";
import { LoanModel } from "../src/modules/loans/loans.schema";
import { AuthenticatedUser } from "../src/middlewares/auth.middleware";

describe("LoansService.create - consistencia transacional", () => {
  let replset: MongoMemoryReplSet;

  beforeAll(async () => {
    replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replset.getUri());
  }, 60000);

  afterEach(async () => {
    await BookModel.deleteMany({});
    await LoanModel.deleteMany({});
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replset.stop();
  });

  const requester: AuthenticatedUser = { id: new mongoose.Types.ObjectId().toString(), role: "MEMBER" };

  it("reverte o decremento de disponibilidade se a criacao do emprestimo falhar", async () => {
    const booksRepository = new BooksRepository();
    const booksService = new BooksService(booksRepository);
    const loansRepository = new LoansRepository();
    const loansService = new LoansService(loansRepository, booksService);

    const book = await booksRepository.create({
      titulo: "Livro Transacional",
      autor: "Autor",
      isbn: "tx-1",
      quantidadeTotal: 1,
      quantidadeDisponivel: 1,
    });

    vi.spyOn(loansRepository, "create").mockRejectedValue(new Error("falha simulada"));

    await expect(
      loansService.create({ livroId: book.id, diasParaDevolucao: 14 }, requester)
    ).rejects.toThrow("falha simulada");

    const bookAfter = await booksRepository.findById(book.id);
    expect(bookAfter?.quantidadeDisponivel).toBe(1);

    const loans = await loansRepository.findAll();
    expect(loans).toHaveLength(0);
  });

  it("cria o emprestimo e decrementa a disponibilidade quando tudo da certo", async () => {
    const booksRepository = new BooksRepository();
    const booksService = new BooksService(booksRepository);
    const loansRepository = new LoansRepository();
    const loansService = new LoansService(loansRepository, booksService);

    const book = await booksRepository.create({
      titulo: "Livro OK",
      autor: "Autor",
      isbn: "tx-2",
      quantidadeTotal: 1,
      quantidadeDisponivel: 1,
    });

    const loan = await loansService.create(
      { livroId: book.id, diasParaDevolucao: 14 },
      requester
    );

    expect(loan.livroId).toBe(book.id);

    const bookAfter = await booksRepository.findById(book.id);
    expect(bookAfter?.quantidadeDisponivel).toBe(0);
  });
});
