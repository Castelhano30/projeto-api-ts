import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { useMongoMemoryReplSet } from "./support/mongo-memory";
import { registerAndLogin } from "./support/auth-fixtures";

describe("Loans", () => {
  useMongoMemoryReplSet();
  const app = createApp();

  it("cria um emprestimo com sucesso e decrementa a disponibilidade (fluxo feliz)", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");
    const { token: memberToken } = await registerAndLogin(app, "MEMBER");

    const bookResponse = await request(app)
      .post("/books")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        titulo: "O Cortico",
        autor: "Aluisio Azevedo",
        isbn: "978-85-359-0000-1",
        quantidadeTotal: 1,
      });

    const bookId = bookResponse.body.id as string;

    const loanResponse = await request(app)
      .post("/loans")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ livroId: bookId });

    expect(loanResponse.status).toBe(201);
    expect(loanResponse.body.status).toBe("ATIVO");

    const bookAfterLoan = await request(app)
      .get(`/books/${bookId}`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(bookAfterLoan.body.quantidadeDisponivel).toBe(0);
  });

  it("retorna 409 ao tentar emprestar livro sem exemplares disponiveis (fluxo de erro)", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");
    const { token: memberToken } = await registerAndLogin(app, "MEMBER");

    const bookResponse = await request(app)
      .post("/books")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        titulo: "Iracema",
        autor: "Jose de Alencar",
        isbn: "978-85-359-0000-2",
        quantidadeTotal: 1,
      });

    const bookId = bookResponse.body.id as string;

    await request(app)
      .post("/loans")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ livroId: bookId });

    const secondLoanResponse = await request(app)
      .post("/loans")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ livroId: bookId });

    expect(secondLoanResponse.status).toBe(409);
  });
});
