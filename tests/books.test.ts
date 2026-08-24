import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

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

describe("Books", () => {
  const app = createApp();

  it("permite que um ADMIN crie um livro (fluxo feliz)", async () => {
    const adminToken = await registerAndLogin(app, "ADMIN");

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
    const memberToken = await registerAndLogin(app, "MEMBER");

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
