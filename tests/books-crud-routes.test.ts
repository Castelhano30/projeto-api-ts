import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { useMongoMemoryReplSet } from "./support/mongo-memory";
import { registerAndLogin, createBook } from "./support/auth-fixtures";

const FAKE_ID = "507f1f77bcf86cd799439011";

describe("Books - listagem (GET /books, GET /books/:id)", () => {
  useMongoMemoryReplSet();
  const app = createApp();

  it("lista todos os livros cadastrados via GET /books", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");
    const { token: memberToken } = await registerAndLogin(app, "MEMBER");

    await createBook(app, adminToken, { isbn: `isbn-list-a-${Date.now()}` });
    await createBook(app, adminToken, { isbn: `isbn-list-b-${Date.now()}` });

    const response = await request(app)
      .get("/books")
      .set("Authorization", `Bearer ${memberToken}`);

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThanOrEqual(2);
  });

  it("busca um livro existente por ID via GET /books/:id", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");
    const bookId = await createBook(app, adminToken);

    const response = await request(app)
      .get(`/books/${bookId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(bookId);
  });

  it("retorna 404 ao buscar um livro inexistente via GET /books/:id", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");

    const response = await request(app)
      .get(`/books/${FAKE_ID}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
  });

  it("retorna 400 ao buscar um livro com ID em formato invalido via GET /books/:id", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");

    const response = await request(app)
      .get("/books/id-invalido")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(400);
  });
});

describe("Books - atualizacao (PUT /books/:id)", () => {
  useMongoMemoryReplSet();
  const app = createApp();

  it("permite que um ADMIN atualize um livro (fluxo feliz)", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");
    const bookId = await createBook(app, adminToken);

    const response = await request(app)
      .put(`/books/${bookId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ titulo: "Novo Titulo Atualizado" });

    expect(response.status).toBe(200);
    expect(response.body.titulo).toBe("Novo Titulo Atualizado");
  });

  it("retorna 403 quando um MEMBER tenta atualizar um livro", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");
    const { token: memberToken } = await registerAndLogin(app, "MEMBER");
    const bookId = await createBook(app, adminToken);

    const response = await request(app)
      .put(`/books/${bookId}`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ titulo: "Tentativa Nao Autorizada" });

    expect(response.status).toBe(403);
  });

  it("retorna 404 ao tentar atualizar um livro inexistente", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");

    const response = await request(app)
      .put(`/books/${FAKE_ID}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ titulo: "Titulo Qualquer" });

    expect(response.status).toBe(404);
  });

  it("retorna 409 ao tentar atualizar o ISBN para um valor ja usado por outro livro", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");
    const isbnExistente = `isbn-conflito-${Date.now()}`;
    await createBook(app, adminToken, { isbn: isbnExistente });
    const bookId = await createBook(app, adminToken, { isbn: `isbn-outro-${Date.now()}` });

    const response = await request(app)
      .put(`/books/${bookId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ isbn: isbnExistente });

    expect(response.status).toBe(409);
  });
});

describe("Books - remocao (DELETE /books/:id)", () => {
  useMongoMemoryReplSet();
  const app = createApp();

  it("permite que um ADMIN remova um livro (fluxo feliz)", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");
    const bookId = await createBook(app, adminToken);

    const deleteResponse = await request(app)
      .delete(`/books/${bookId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(deleteResponse.status).toBe(204);

    const getResponse = await request(app)
      .get(`/books/${bookId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(getResponse.status).toBe(404);
  });

  it("retorna 403 quando um MEMBER tenta remover um livro", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");
    const { token: memberToken } = await registerAndLogin(app, "MEMBER");
    const bookId = await createBook(app, adminToken);

    const response = await request(app)
      .delete(`/books/${bookId}`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(response.status).toBe(403);
  });

  it("retorna 404 ao tentar remover um livro inexistente", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");

    const response = await request(app)
      .delete(`/books/${FAKE_ID}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
  });
});
