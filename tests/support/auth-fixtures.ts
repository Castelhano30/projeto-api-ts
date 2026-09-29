import request from "supertest";
import { createApp } from "../../src/app";

export interface RegisteredUser {
  token: string;
  id: string;
  email: string;
}

/**
 * Registra e autentica um usuario de teste, retornando o token JWT junto com
 * o id e o email usados no cadastro. Compartilhado entre todas as suites E2E
 * (auth, books, loans, users) para evitar duplicacao do fluxo de
 * registro+login em cada arquivo de teste.
 */
export async function registerAndLogin(
  app: ReturnType<typeof createApp>,
  papel: "ADMIN" | "MEMBER",
  overrides: Partial<{ nome: string; email: string; senha: string }> = {}
): Promise<RegisteredUser> {
  const email =
    overrides.email ?? `${papel.toLowerCase()}-${Date.now()}-${Math.random()}@example.com`;
  const senha = overrides.senha ?? "senha123";

  const registerResponse = await request(app).post("/auth/register").send({
    nome: overrides.nome ?? `Usuario ${papel}`,
    email,
    senha,
    papel,
  });

  const loginResponse = await request(app).post("/auth/login").send({ email, senha });

  return {
    token: loginResponse.body.token as string,
    id: registerResponse.body.id as string,
    email,
  };
}

/**
 * Cria um livro via HTTP (POST /books) usando um token ADMIN e retorna o id
 * do livro criado. Compartilhado entre as suites de books e loans, que
 * precisam de um livro existente como pre-condicao para seus cenarios.
 */
export async function createBook(
  app: ReturnType<typeof createApp>,
  adminToken: string,
  overrides: Partial<{ titulo: string; autor: string; isbn: string; quantidadeTotal: number }> = {}
): Promise<string> {
  const response = await request(app)
    .post("/books")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      titulo: overrides.titulo ?? "Livro de Teste",
      autor: overrides.autor ?? "Autor de Teste",
      isbn: overrides.isbn ?? `978-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      quantidadeTotal: overrides.quantidadeTotal ?? 1,
    });

  return response.body.id as string;
}
