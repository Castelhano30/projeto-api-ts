import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { useMongoMemoryReplSet } from "./support/mongo-memory";
import { registerAndLogin } from "./support/auth-fixtures";

describe("Books", () => {
  useMongoMemoryReplSet();
  const app = createApp();

  it("permite que um ADMIN crie um livro (fluxo feliz)", async () => {
    const { token: adminToken } = await registerAndLogin(app, "ADMIN");

    const response = await request(app)
      .post("/books")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        titulo: "Dom Casmurro",
        autor: "Machado de Assis",
        isbn: "978-85-359-0277-5",
        quantidadeTotal: 3,
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      titulo: "Dom Casmurro",
      quantidadeTotal: 3,
      quantidadeDisponivel: 3,
    });
  });

  it("retorna 403 quando um MEMBER tenta criar um livro (fluxo de erro)", async () => {
    const { token: memberToken } = await registerAndLogin(app, "MEMBER");

    const response = await request(app)
      .post("/books")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({
        titulo: "Livro Qualquer",
        autor: "Autor Qualquer",
        isbn: "111-11-111-1111-1",
        quantidadeTotal: 1,
      });

    expect(response.status).toBe(403);
  });
});
