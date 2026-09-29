import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { useMongoMemoryReplSet } from "./support/mongo-memory";

describe("Auth", () => {
  useMongoMemoryReplSet();
  const app = createApp();

  it("registra e autentica um usuario com sucesso (fluxo feliz)", async () => {
    const registerResponse = await request(app).post("/auth/register").send({
      nome: "Maria Silva",
      email: "maria@example.com",
      senha: "senha123",
      papel: "MEMBER",
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body).toMatchObject({
      nome: "Maria Silva",
      email: "maria@example.com",
      papel: "MEMBER",
    });
    expect(registerResponse.body.senhaHash).toBeUndefined();

    const loginResponse = await request(app).post("/auth/login").send({
      email: "maria@example.com",
      senha: "senha123",
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toEqual(expect.any(String));
    expect(loginResponse.body.user.email).toBe("maria@example.com");
  });

  it("retorna 401 ao autenticar com senha incorreta (fluxo de erro)", async () => {
    await request(app).post("/auth/register").send({
      nome: "Joao Souza",
      email: "joao@example.com",
      senha: "senha123",
      papel: "MEMBER",
    });

    const loginResponse = await request(app).post("/auth/login").send({
      email: "joao@example.com",
      senha: "senha-errada",
    });

    expect(loginResponse.status).toBe(401);
  });
});
