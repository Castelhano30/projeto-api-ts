import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { useMongoMemoryReplSet } from "./support/mongo-memory";
import { LoanModel } from "../src/modules/loans/loans.schema";
import { registerAndLogin, createBook } from "./support/auth-fixtures";

async function createLoan(
  app: ReturnType<typeof createApp>,
  memberToken: string,
  bookId: string
): Promise<string> {
  const response = await request(app)
    .post("/loans")
    .set("Authorization", `Bearer ${memberToken}`)
    .send({ livroId: bookId });

  return response.body.id as string;
}

describe("Loans - devolucao (PATCH /loans/:id/return)", () => {
  useMongoMemoryReplSet();
  const app = createApp();

  it("devolve um emprestimo ativo com sucesso e reincrementa a disponibilidade do livro (fluxo feliz)", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");
    const { token: memberToken } = await registerAndLogin(app, "MEMBER");

    const bookId = await createBook(app, adminToken);
    const loanId = await createLoan(app, memberToken, bookId);

    const returnResponse = await request(app)
      .patch(`/loans/${loanId}/return`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(returnResponse.status).toBe(200);
    expect(returnResponse.body.status).toBe("DEVOLVIDO");
    expect(returnResponse.body.dataDevolucao).not.toBeNull();

    const bookAfterReturn = await request(app)
      .get(`/books/${bookId}`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(bookAfterReturn.body.quantidadeDisponivel).toBe(1);
  });

  it("retorna 409 ao tentar devolver um emprestimo que ja foi devolvido (fluxo de erro)", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");
    const { token: memberToken } = await registerAndLogin(app, "MEMBER");

    const bookId = await createBook(app, adminToken);
    const loanId = await createLoan(app, memberToken, bookId);

    await request(app)
      .patch(`/loans/${loanId}/return`)
      .set("Authorization", `Bearer ${memberToken}`);

    const secondReturnResponse = await request(app)
      .patch(`/loans/${loanId}/return`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(secondReturnResponse.status).toBe(409);
  });

  it("retorna 404 ao tentar devolver um emprestimo inexistente", async () => {
    const { token: memberToken } = await registerAndLogin(app, "MEMBER");
    const fakeId = "507f1f77bcf86cd799439011";

    const response = await request(app)
      .patch(`/loans/${fakeId}/return`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(response.status).toBe(404);
  });

  it("retorna 403 quando um MEMBER tenta devolver o emprestimo de outro usuario", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");
    const { token: ownerToken } = await registerAndLogin(app, "MEMBER");
    const { token: otherMemberToken } = await registerAndLogin(app, "MEMBER");

    const bookId = await createBook(app, adminToken);
    const loanId = await createLoan(app, ownerToken, bookId);

    const response = await request(app)
      .patch(`/loans/${loanId}/return`)
      .set("Authorization", `Bearer ${otherMemberToken}`);

    expect(response.status).toBe(403);
  });

  it("marca automaticamente o emprestimo como ATRASADO quando a data prevista de devolucao ja passou", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");
    const { token: memberToken } = await registerAndLogin(app, "MEMBER");

    const bookId = await createBook(app, adminToken);
    const loanId = await createLoan(app, memberToken, bookId);

    // Backdata a data prevista de devolucao diretamente no banco (nao ha campo
    // de API para isso) para forcar o refreshStatus a recalcular o status
    // como ATRASADO na proxima leitura.
    await LoanModel.findByIdAndUpdate(loanId, {
      dataPrevistaDevolucao: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    });

    const response = await request(app)
      .get(`/loans/${loanId}`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ATRASADO");
  });
});

describe("Loans - listagem (GET /loans, GET /loans/:id)", () => {
  useMongoMemoryReplSet();
  const app = createApp();

  it("ADMIN ve todos os emprestimos ao listar via GET /loans", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");
    const { token: memberAToken } = await registerAndLogin(app, "MEMBER");
    const { token: memberBToken } = await registerAndLogin(app, "MEMBER");

    const bookAId = await createBook(app, adminToken, { isbn: `isbn-a-${Date.now()}` });
    const bookBId = await createBook(app, adminToken, { isbn: `isbn-b-${Date.now()}` });

    await createLoan(app, memberAToken, bookAId);
    await createLoan(app, memberBToken, bookBId);

    const response = await request(app)
      .get("/loans")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThanOrEqual(2);
  });

  it("MEMBER ve apenas os proprios emprestimos ao listar via GET /loans", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");
    const { token: memberAToken } = await registerAndLogin(app, "MEMBER");
    const { token: memberBToken } = await registerAndLogin(app, "MEMBER");

    const bookAId = await createBook(app, adminToken, { isbn: `isbn-c-${Date.now()}` });
    const bookBId = await createBook(app, adminToken, { isbn: `isbn-d-${Date.now()}` });

    await createLoan(app, memberAToken, bookAId);
    await createLoan(app, memberBToken, bookBId);

    const response = await request(app)
      .get("/loans")
      .set("Authorization", `Bearer ${memberAToken}`);

    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
  });

  it("permite que o dono do emprestimo busque-o por ID via GET /loans/:id", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");
    const { token: memberToken } = await registerAndLogin(app, "MEMBER");

    const bookId = await createBook(app, adminToken);
    const loanId = await createLoan(app, memberToken, bookId);

    const response = await request(app)
      .get(`/loans/${loanId}`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(loanId);
  });

  it("retorna 403 quando um MEMBER tenta buscar o emprestimo de outro usuario via GET /loans/:id", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");
    const { token: ownerToken } = await registerAndLogin(app, "MEMBER");
    const { token: otherMemberToken } = await registerAndLogin(app, "MEMBER");

    const bookId = await createBook(app, adminToken);
    const loanId = await createLoan(app, ownerToken, bookId);

    const response = await request(app)
      .get(`/loans/${loanId}`)
      .set("Authorization", `Bearer ${otherMemberToken}`);

    expect(response.status).toBe(403);
  });

  it("permite que um ADMIN busque o emprestimo de qualquer usuario via GET /loans/:id", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");
    const { token: memberToken } = await registerAndLogin(app, "MEMBER");

    const bookId = await createBook(app, adminToken);
    const loanId = await createLoan(app, memberToken, bookId);

    const response = await request(app)
      .get(`/loans/${loanId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(loanId);
  });

  it("retorna 404 ao buscar um emprestimo inexistente via GET /loans/:id", async () => {
    const { token: memberToken } = await registerAndLogin(app, "MEMBER");
    const fakeId = "507f1f77bcf86cd799439011";

    const response = await request(app)
      .get(`/loans/${fakeId}`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(response.status).toBe(404);
  });
});
