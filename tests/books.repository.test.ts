import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { BooksRepository } from "../src/modules/books/books.repository";
import { BookModel } from "../src/modules/books/books.schema";

describe("BooksRepository (Mongoose)", () => {
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

  it("cria um livro e retorna id como string", async () => {
    const book = await repository.create({
      titulo: "Dom Casmurro",
      autor: "Machado de Assis",
      isbn: "978-85-359-0277-5",
      quantidadeTotal: 3,
      quantidadeDisponivel: 3,
    });

    expect(typeof book.id).toBe("string");
    expect(book.titulo).toBe("Dom Casmurro");
  });

  it("busca por id", async () => {
    const created = await repository.create({
      titulo: "Livro X",
      autor: "Autor X",
      isbn: "111",
      quantidadeTotal: 1,
      quantidadeDisponivel: 1,
    });

    const found = await repository.findById(created.id);
    expect(found?.id).toBe(created.id);
    expect(found?.titulo).toBe("Livro X");
  });

  it("retorna undefined ao buscar id inexistente ou invalido", async () => {
    const validButMissing = new mongoose.Types.ObjectId().toString();
    expect(await repository.findById(validButMissing)).toBeUndefined();
    expect(await repository.findById("id-invalido")).toBeUndefined();
  });

  it("busca por isbn", async () => {
    const created = await repository.create({
      titulo: "Livro Y",
      autor: "Autor Y",
      isbn: "222",
      quantidadeTotal: 1,
      quantidadeDisponivel: 1,
    });

    const found = await repository.findByIsbn("222");
    expect(found?.id).toBe(created.id);
  });

  it("lista todos os livros", async () => {
    await repository.create({
      titulo: "A",
      autor: "A",
      isbn: "a1",
      quantidadeTotal: 1,
      quantidadeDisponivel: 1,
    });
    await repository.create({
      titulo: "B",
      autor: "B",
      isbn: "b1",
      quantidadeTotal: 1,
      quantidadeDisponivel: 1,
    });

    const all = await repository.findAll();
    expect(all).toHaveLength(2);
  });

  it("atualiza um livro existente", async () => {
    const created = await repository.create({
      titulo: "Original",
      autor: "Autor",
      isbn: "333",
      quantidadeTotal: 5,
      quantidadeDisponivel: 5,
    });

    const updated = await repository.update(created.id, { quantidadeDisponivel: 2 });
    expect(updated?.quantidadeDisponivel).toBe(2);
    expect(updated?.titulo).toBe("Original");
  });

  it("retorna undefined ao atualizar id inexistente", async () => {
    const missing = new mongoose.Types.ObjectId().toString();
    expect(await repository.update(missing, { titulo: "X" })).toBeUndefined();
  });

  it("exclui um livro existente e retorna true", async () => {
    const created = await repository.create({
      titulo: "Para excluir",
      autor: "Autor",
      isbn: "444",
      quantidadeTotal: 1,
      quantidadeDisponivel: 1,
    });

    expect(await repository.delete(created.id)).toBe(true);
    expect(await repository.findById(created.id)).toBeUndefined();
  });

  it("retorna false ao excluir id inexistente", async () => {
    const missing = new mongoose.Types.ObjectId().toString();
    expect(await repository.delete(missing)).toBe(false);
  });
});
