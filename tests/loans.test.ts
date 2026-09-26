import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { useMongoMemoryReplSet } from "./support/mongo-memory";

async function registerAndLogin(
  app: ReturnType<typeof createApp>,
  papel: "ADMIN" | "MEMBER"
): Promise<string> {
  const email = `${papel.toLowerCase()}-${Date.now()}-${Math.random()}@example.com`;
  await request(app).post("/auth/register").send({
    nome: `Usuario ${papel}`,
    email,
    senha: "senha123",
    papel,
  });

  const loginResponse = await request(app).post("/auth/login").send({
    email,
    senha: "senha123",
  });

  return loginResponse.body.token as string;
}

describe("Loans", () => {
  useMongoMemoryReplSet();
  const app = createApp();

  it("cria um emprestimo com sucesso e decrementa a disponibilidade (fluxo feliz)", async () => {
    const adminToken = await registerAndLogin(app, "ADMIN");
    const memberToken = await registerAndLogin(app, "MEMBER");

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
    const adminToken = await registerAndLogin(app, "ADMIN");
    const memberToken = await registerAndLogin(app, "MEMBER");

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
