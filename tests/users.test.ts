import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { useMongoMemoryReplSet } from "./support/mongo-memory";
import { registerAndLogin } from "./support/auth-fixtures";

describe("Users", () => {
  useMongoMemoryReplSet();
  const app = createApp();

  describe("GET /users", () => {
    it("permite que ADMIN liste todos os usuarios", async () => {
      const admin = await registerAndLogin(app, "ADMIN");
      await registerAndLogin(app, "MEMBER");

      const response = await request(app)
        .get("/users")
        .set("Authorization", `Bearer ${admin.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it("retorna 403 quando um MEMBER tenta listar usuarios", async () => {
      const member = await registerAndLogin(app, "MEMBER");

      const response = await request(app)
        .get("/users")
        .set("Authorization", `Bearer ${member.token}`);

      expect(response.status).toBe(403);
    });
  });

  describe("PUT/PATCH /users/:id", () => {
    it("permite que o proprio usuario atualize seu nome (fluxo feliz)", async () => {
      const member = await registerAndLogin(app, "MEMBER");

      const response = await request(app)
        .patch(`/users/${member.id}`)
        .set("Authorization", `Bearer ${member.token}`)
        .send({ nome: "Nome Atualizado" });

      expect(response.status).toBe(200);
      expect(response.body.nome).toBe("Nome Atualizado");
      expect(response.body.senhaHash).toBeUndefined();
    });

    it("permite que ADMIN atualize outro usuario", async () => {
      const admin = await registerAndLogin(app, "ADMIN");
      const member = await registerAndLogin(app, "MEMBER");

      const response = await request(app)
        .put(`/users/${member.id}`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ nome: "Alterado pelo Admin" });

      expect(response.status).toBe(200);
      expect(response.body.nome).toBe("Alterado pelo Admin");
    });

    it("retorna 403 quando um MEMBER tenta atualizar outro usuario (fluxo de erro)", async () => {
      const member = await registerAndLogin(app, "MEMBER");
      const outro = await registerAndLogin(app, "MEMBER");

      const response = await request(app)
        .patch(`/users/${outro.id}`)
        .set("Authorization", `Bearer ${member.token}`)
        .send({ nome: "Tentativa Indevida" });

      expect(response.status).toBe(403);
    });

    it("retorna 403 (nao 400) quando um MEMBER tenta atualizar outro usuario com body invalido", async () => {
      const member = await registerAndLogin(app, "MEMBER");
      const outro = await registerAndLogin(app, "MEMBER");

      const response = await request(app)
        .patch(`/users/${outro.id}`)
        .set("Authorization", `Bearer ${member.token}`)
        .send({ email: "email-invalido" });

      expect(response.status).toBe(403);
    });

    it("retorna 401 quando nao autenticado", async () => {
      const member = await registerAndLogin(app, "MEMBER");

      const response = await request(app).patch(`/users/${member.id}`).send({ nome: "X" });

      expect(response.status).toBe(401);
    });

    it("retorna 400 quando MEMBER tenta alterar o proprio papel", async () => {
      const member = await registerAndLogin(app, "MEMBER");

      const response = await request(app)
        .patch(`/users/${member.id}`)
        .set("Authorization", `Bearer ${member.token}`)
        .send({ papel: "ADMIN" });

      expect(response.status).toBe(400);
    });

    it("permite que ADMIN altere o papel de outro usuario", async () => {
      const admin = await registerAndLogin(app, "ADMIN");
      const member = await registerAndLogin(app, "MEMBER");

      const response = await request(app)
        .put(`/users/${member.id}`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ papel: "ADMIN" });

      expect(response.status).toBe(200);
      expect(response.body.papel).toBe("ADMIN");
    });
  });

  describe("DELETE /users/:id", () => {
    it("permite que o proprio usuario exclua sua conta (fluxo feliz)", async () => {
      const member = await registerAndLogin(app, "MEMBER");

      const response = await request(app)
        .delete(`/users/${member.id}`)
        .set("Authorization", `Bearer ${member.token}`);

      expect(response.status).toBe(204);
    });

    it("retorna 403 quando um MEMBER tenta excluir outro usuario (fluxo de erro)", async () => {
      const member = await registerAndLogin(app, "MEMBER");
      const outro = await registerAndLogin(app, "MEMBER");

      const response = await request(app)
        .delete(`/users/${outro.id}`)
        .set("Authorization", `Bearer ${member.token}`);

      expect(response.status).toBe(403);
    });

    it("permite que ADMIN exclua outro usuario", async () => {
      const admin = await registerAndLogin(app, "ADMIN");
      const member = await registerAndLogin(app, "MEMBER");

      const response = await request(app)
        .delete(`/users/${member.id}`)
        .set("Authorization", `Bearer ${admin.token}`);

      expect(response.status).toBe(204);
    });

    it("retorna 409 ao tentar excluir usuario com emprestimo ativo", async () => {
      const admin = await registerAndLogin(app, "ADMIN");
      const member = await registerAndLogin(app, "MEMBER");

      const bookResponse = await request(app)
        .post("/books")
        .set("Authorization", `Bearer ${admin.token}`)
        .send({
          titulo: "Livro para Emprestimo",
          autor: "Autor Teste",
          isbn: `isbn-${Date.now()}`,
          quantidadeTotal: 1,
        });

      await request(app)
        .post("/loans")
        .set("Authorization", `Bearer ${member.token}`)
        .send({ livroId: bookResponse.body.id });

      const response = await request(app)
        .delete(`/users/${member.id}`)
        .set("Authorization", `Bearer ${member.token}`);

      expect(response.status).toBe(409);
    });
  });
});
