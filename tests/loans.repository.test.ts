import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { LoansRepository } from "../src/modules/loans/loans.repository";
import { LoanModel } from "../src/modules/loans/loans.schema";
import { BookModel } from "../src/modules/books/books.schema";
import { UserModel } from "../src/modules/users/users.schema";

describe("LoansRepository (Mongoose)", () => {
  let mongod: MongoMemoryServer;
  const repository = new LoansRepository();
  let bookId: string;
  let userId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });

  afterEach(async () => {
    await LoanModel.deleteMany({});
    await BookModel.deleteMany({});
    await UserModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  async function seedBookAndUser(): Promise<void> {
    const book = await BookModel.create({
      titulo: "Refactoring",
      autor: "Martin Fowler",
      isbn: "9780134757599",
      quantidadeTotal: 2,
      quantidadeDisponivel: 2,
    });
    const user = await UserModel.create({
      nome: "Leitor",
      email: "leitor@example.com",
      senhaHash: "hash",
      papel: "MEMBER",
    });
    bookId = String(book._id);
    userId = String(user._id);
  }

  it("cria um emprestimo referenciando livroId/usuarioId como string", async () => {
    await seedBookAndUser();

    const loan = await repository.create({
      livroId: bookId,
      usuarioId: userId,
      dataEmprestimo: new Date().toISOString(),
      dataPrevistaDevolucao: new Date().toISOString(),
      dataDevolucao: null,
      status: "ATIVO",
    });

    expect(typeof loan.id).toBe("string");
    expect(loan.livroId).toBe(bookId);
    expect(loan.usuarioId).toBe(userId);
  });

  it("busca por id", async () => {
    await seedBookAndUser();
    const created = await repository.create({
      livroId: bookId,
      usuarioId: userId,
      dataEmprestimo: new Date().toISOString(),
      dataPrevistaDevolucao: new Date().toISOString(),
      dataDevolucao: null,
      status: "ATIVO",
    });

    const found = await repository.findById(created.id);
    expect(found?.id).toBe(created.id);
    expect(found?.livroId).toBe(bookId);
  });

  it("retorna undefined ao buscar id inexistente ou invalido", async () => {
    const validButMissing = new mongoose.Types.ObjectId().toString();
    expect(await repository.findById(validButMissing)).toBeUndefined();
    expect(await repository.findById("id-invalido")).toBeUndefined();
  });

  it("lista todos os emprestimos", async () => {
    await seedBookAndUser();
    await repository.create({
      livroId: bookId,
      usuarioId: userId,
      dataEmprestimo: new Date().toISOString(),
      dataPrevistaDevolucao: new Date().toISOString(),
      dataDevolucao: null,
      status: "ATIVO",
    });

    expect(await repository.findAll()).toHaveLength(1);
  });

  it("filtra emprestimos por usuarioId", async () => {
    await seedBookAndUser();
    await repository.create({
      livroId: bookId,
      usuarioId: userId,
      dataEmprestimo: new Date().toISOString(),
      dataPrevistaDevolucao: new Date().toISOString(),
      dataDevolucao: null,
      status: "ATIVO",
    });

    const outroUsuario = await UserModel.create({
      nome: "Outro",
      email: "outro@example.com",
      senhaHash: "hash",
      papel: "MEMBER",
    });
    await repository.create({
      livroId: bookId,
      usuarioId: String(outroUsuario._id),
      dataEmprestimo: new Date().toISOString(),
      dataPrevistaDevolucao: new Date().toISOString(),
      dataDevolucao: null,
      status: "ATIVO",
    });

    const doUsuario = await repository.findByUserId(userId);
    expect(doUsuario).toHaveLength(1);
    expect(doUsuario[0].usuarioId).toBe(userId);
  });

  it("atualiza um emprestimo existente", async () => {
    await seedBookAndUser();
    const created = await repository.create({
      livroId: bookId,
      usuarioId: userId,
      dataEmprestimo: new Date().toISOString(),
      dataPrevistaDevolucao: new Date().toISOString(),
      dataDevolucao: null,
      status: "ATIVO",
    });

    const updated = await repository.update(created.id, { status: "DEVOLVIDO" });
    expect(updated?.status).toBe("DEVOLVIDO");
    expect(updated?.livroId).toBe(bookId);
  });

  it("retorna undefined ao atualizar id inexistente", async () => {
    const missing = new mongoose.Types.ObjectId().toString();
    expect(await repository.update(missing, { status: "DEVOLVIDO" })).toBeUndefined();
  });
});
