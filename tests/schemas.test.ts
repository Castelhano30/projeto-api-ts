import { afterAll, beforeAll, afterEach, describe, expect, it } from "vitest";
import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { UserModel } from "../src/modules/users/users.schema";
import { BookModel } from "../src/modules/books/books.schema";
import { LoanModel } from "../src/modules/loans/loans.schema";

describe("Mongoose schemas", () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });

  afterEach(async () => {
    await UserModel.deleteMany({});
    await BookModel.deleteMany({});
    await LoanModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it("cria e persiste um User com os campos do dominio", async () => {
    const user = await UserModel.create({
      nome: "Ada Lovelace",
      email: "ada@example.com",
      senhaHash: "hash",
      papel: "ADMIN",
    });

    expect(user._id).toBeInstanceOf(Types.ObjectId);
    expect(user.nome).toBe("Ada Lovelace");
    expect(user.papel).toBe("ADMIN");
  });

  it("rejeita papel de User fora do enum", async () => {
    await expect(
      UserModel.create({
        nome: "Invalido",
        email: "invalido@example.com",
        senhaHash: "hash",
        papel: "SUPERADMIN",
      })
    ).rejects.toThrow();
  });

  it("impede dois Users com o mesmo email (indice unique)", async () => {
    await UserModel.create({
      nome: "Primeiro",
      email: "duplicado@example.com",
      senhaHash: "hash",
      papel: "MEMBER",
    });
    await UserModel.syncIndexes();

    await expect(
      UserModel.create({
        nome: "Segundo",
        email: "duplicado@example.com",
        senhaHash: "hash",
        papel: "MEMBER",
      })
    ).rejects.toThrow();
  });

  it("cria e persiste um Book com os campos do dominio", async () => {
    const book = await BookModel.create({
      titulo: "Clean Code",
      autor: "Robert C. Martin",
      isbn: "9780132350884",
      quantidadeTotal: 3,
      quantidadeDisponivel: 3,
    });

    expect(book._id).toBeInstanceOf(Types.ObjectId);
    expect(book.isbn).toBe("9780132350884");
    expect(book.quantidadeDisponivel).toBe(3);
  });

  it("impede dois Books com o mesmo isbn (indice unique)", async () => {
    await BookModel.create({
      titulo: "Livro A",
      autor: "Autor A",
      isbn: "1111111111",
      quantidadeTotal: 1,
      quantidadeDisponivel: 1,
    });
    await BookModel.syncIndexes();

    await expect(
      BookModel.create({
        titulo: "Livro B",
        autor: "Autor B",
        isbn: "1111111111",
        quantidadeTotal: 1,
        quantidadeDisponivel: 1,
      })
    ).rejects.toThrow();
  });

  it("cria um Loan referenciando Book e User via ObjectId (ref)", async () => {
    const user = await UserModel.create({
      nome: "Leitor",
      email: "leitor@example.com",
      senhaHash: "hash",
      papel: "MEMBER",
    });
    const book = await BookModel.create({
      titulo: "Refactoring",
      autor: "Martin Fowler",
      isbn: "9780134757599",
      quantidadeTotal: 2,
      quantidadeDisponivel: 2,
    });

    const loan = await LoanModel.create({
      livroId: book._id,
      usuarioId: user._id,
      dataEmprestimo: new Date().toISOString(),
      dataPrevistaDevolucao: new Date().toISOString(),
      dataDevolucao: null,
      status: "ATIVO",
    });

    expect(loan.livroId).toEqual(book._id);
    expect(loan.usuarioId).toEqual(user._id);

    const populated = await LoanModel.findById(loan._id).populate("livroId").populate("usuarioId");
    expect((populated?.livroId as unknown as { titulo: string }).titulo).toBe("Refactoring");
    expect((populated?.usuarioId as unknown as { nome: string }).nome).toBe("Leitor");
  });

  it("rejeita status de Loan fora do enum", async () => {
    const user = await UserModel.create({
      nome: "Leitor",
      email: "leitor2@example.com",
      senhaHash: "hash",
      papel: "MEMBER",
    });
    const book = await BookModel.create({
      titulo: "Livro",
      autor: "Autor",
      isbn: "2222222222",
      quantidadeTotal: 1,
      quantidadeDisponivel: 1,
    });

    await expect(
      LoanModel.create({
        livroId: book._id,
        usuarioId: user._id,
        dataEmprestimo: new Date().toISOString(),
        dataPrevistaDevolucao: new Date().toISOString(),
        dataDevolucao: null,
        status: "CANCELADO",
      })
    ).rejects.toThrow();
  });
});
