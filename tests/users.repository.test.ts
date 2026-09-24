import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { UsersRepository } from "../src/modules/users/users.repository";
import { UserModel } from "../src/modules/users/users.schema";

describe("UsersRepository (Mongoose)", () => {
  let mongod: MongoMemoryServer;
  const repository = new UsersRepository();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });

  afterEach(async () => {
    await UserModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it("cria um usuario e retorna id como string", async () => {
    const user = await repository.create({
      nome: "Ada Lovelace",
      email: "ada@example.com",
      senhaHash: "hash",
      papel: "ADMIN",
    });

    expect(typeof user.id).toBe("string");
    expect(user.nome).toBe("Ada Lovelace");
  });

  it("busca por id", async () => {
    const created = await repository.create({
      nome: "Usuario X",
      email: "x@example.com",
      senhaHash: "hash",
      papel: "MEMBER",
    });

    const found = await repository.findById(created.id);
    expect(found?.id).toBe(created.id);
  });

  it("retorna undefined ao buscar id inexistente ou invalido", async () => {
    const validButMissing = new mongoose.Types.ObjectId().toString();
    expect(await repository.findById(validButMissing)).toBeUndefined();
    expect(await repository.findById("id-invalido")).toBeUndefined();
  });

  it("busca por email", async () => {
    const created = await repository.create({
      nome: "Usuario Y",
      email: "y@example.com",
      senhaHash: "hash",
      papel: "MEMBER",
    });

    const found = await repository.findByEmail("y@example.com");
    expect(found?.id).toBe(created.id);
  });

  it("lista todos os usuarios", async () => {
    await repository.create({
      nome: "A",
      email: "a@example.com",
      senhaHash: "hash",
      papel: "MEMBER",
    });
    await repository.create({
      nome: "B",
      email: "b@example.com",
      senhaHash: "hash",
      papel: "MEMBER",
    });

    expect(await repository.findAll()).toHaveLength(2);
  });

  it("atualiza um usuario existente", async () => {
    const created = await repository.create({
      nome: "Original",
      email: "original@example.com",
      senhaHash: "hash",
      papel: "MEMBER",
    });

    const updated = await repository.update(created.id, { nome: "Atualizado" });
    expect(updated?.nome).toBe("Atualizado");
    expect(updated?.email).toBe("original@example.com");
  });

  it("retorna undefined ao atualizar id inexistente", async () => {
    const missing = new mongoose.Types.ObjectId().toString();
    expect(await repository.update(missing, { nome: "X" })).toBeUndefined();
  });

  it("exclui um usuario existente e retorna true", async () => {
    const created = await repository.create({
      nome: "Para excluir",
      email: "excluir@example.com",
      senhaHash: "hash",
      papel: "MEMBER",
    });

    expect(await repository.delete(created.id)).toBe(true);
    expect(await repository.findById(created.id)).toBeUndefined();
  });

  it("retorna false ao excluir id inexistente", async () => {
    const missing = new mongoose.Types.ObjectId().toString();
    expect(await repository.delete(missing)).toBe(false);
  });
});
