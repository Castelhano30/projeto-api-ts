import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { BooksRepository } from "../src/modules/books/books.repository";
import { BookModel } from "../src/modules/books/books.schema";

describe("BooksRepository - decrementAvailabilityIfAvailable (concorrencia)", () => {
  let mongod: MongoMemoryServer;
  const repository = new BooksRepository();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });

  afterEach(async () => {
    await BookModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it("nao permite duas decrementacoes concorrentes esgotarem o estoque abaixo de zero", async () => {
    const book = await repository.create({
      titulo: "Livro Raro",
      autor: "Autor",
      isbn: "999",
      quantidadeTotal: 1,
      quantidadeDisponivel: 1,
    });

    const [first, second] = await Promise.all([
      repository.decrementAvailabilityIfAvailable(book.id),
      repository.decrementAvailabilityIfAvailable(book.id),
    ]);

    const succeeded = [first, second].filter((result) => result !== undefined);
    expect(succeeded).toHaveLength(1);

    const finalState = await repository.findById(book.id);
    expect(finalState?.quantidadeDisponivel).toBe(0);
  });

  it("retorna undefined quando nao ha exemplares disponiveis", async () => {
    const book = await repository.create({
      titulo: "Esgotado",
      autor: "Autor",
      isbn: "888",
      quantidadeTotal: 1,
      quantidadeDisponivel: 0,
    });

    expect(await repository.decrementAvailabilityIfAvailable(book.id)).toBeUndefined();
  });

  it("nao permite duas incrementacoes concorrentes perderem uma devolucao", async () => {
    const book = await repository.create({
      titulo: "Livro Popular",
      autor: "Autor",
      isbn: "777",
      quantidadeTotal: 5,
      quantidadeDisponivel: 1,
    });

    await Promise.all([
      repository.incrementAvailability(book.id),
      repository.incrementAvailability(book.id),
    ]);

    const finalState = await repository.findById(book.id);
    expect(finalState?.quantidadeDisponivel).toBe(3);
  });

  it("nao incrementa alem de quantidadeTotal", async () => {
    const book = await repository.create({
      titulo: "No Limite",
      autor: "Autor",
      isbn: "666",
      quantidadeTotal: 2,
      quantidadeDisponivel: 2,
    });

    const updated = await repository.incrementAvailability(book.id);
    expect(updated?.quantidadeDisponivel).toBe(2);
  });
});
