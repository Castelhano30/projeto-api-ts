import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcrypt";
import { UsersRepository } from "../src/modules/users/users.repository";
import { UsersService } from "../src/modules/users/users.service";
import { UserModel } from "../src/modules/users/users.schema";
import { LoansRepository } from "../src/modules/loans/loans.repository";
import { LoanModel } from "../src/modules/loans/loans.schema";
import { AuthenticatedUser } from "../src/middlewares/auth.middleware";
import { AppError, ConflictError, NotFoundError } from "../src/utils/app-error";

describe("UsersService.updateUser / deleteUser", () => {
  let mongod: MongoMemoryServer;
  const repository = new UsersRepository();
  const loansRepository = new LoansRepository();
  const service = new UsersService(repository, loansRepository);

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });

  afterEach(async () => {
    await UserModel.deleteMany({});
    await LoanModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  async function createUser(overrides: Partial<{ nome: string; email: string; papel: "ADMIN" | "MEMBER" }> = {}) {
    return repository.create({
      nome: overrides.nome ?? "Usuario Original",
      email: overrides.email ?? "original@example.com",
      senhaHash: "hash-antigo",
      papel: overrides.papel ?? "MEMBER",
    });
  }

  it("permite que o proprio usuario atualize seu nome", async () => {
    const user = await createUser();
    const requester: AuthenticatedUser = { id: user.id, role: "MEMBER" };

    const updated = await service.updateUser(user.id, { nome: "Novo Nome" }, requester);

    expect(updated.nome).toBe("Novo Nome");
    expect(updated).not.toHaveProperty("senhaHash");
  });

  it("permite que ADMIN atualize o papel de outro usuario", async () => {
    const user = await createUser();
    const admin: AuthenticatedUser = { id: new mongoose.Types.ObjectId().toString(), role: "ADMIN" };

    const updated = await service.updateUser(user.id, { papel: "ADMIN" }, admin);

    expect(updated.papel).toBe("ADMIN");
  });

  it("rejeita com 400 quando um MEMBER tenta alterar o proprio papel", async () => {
    const user = await createUser();
    const requester: AuthenticatedUser = { id: user.id, role: "MEMBER" };

    await expect(
      service.updateUser(user.id, { papel: "ADMIN" }, requester)
    ).rejects.toMatchObject({ statusCode: 400 } satisfies Partial<AppError>);
  });

  it("re-hasheia a senha quando enviada", async () => {
    const user = await createUser();
    const requester: AuthenticatedUser = { id: user.id, role: "MEMBER" };

    await service.updateUser(user.id, { senha: "nova-senha-123" }, requester);

    const persisted = await repository.findById(user.id);
    expect(persisted?.senhaHash).not.toBe("hash-antigo");
    expect(await bcrypt.compare("nova-senha-123", persisted?.senhaHash ?? "")).toBe(true);
  });

  it("rejeita com ConflictError ao atualizar para um email ja usado por outro usuario", async () => {
    await createUser({ email: "ocupado@example.com" });
    const user = await createUser({ email: "livre@example.com" });
    const requester: AuthenticatedUser = { id: user.id, role: "MEMBER" };

    await expect(
      service.updateUser(user.id, { email: "ocupado@example.com" }, requester)
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("lanca NotFoundError ao atualizar um usuario inexistente", async () => {
    const missing = new mongoose.Types.ObjectId().toString();
    const admin: AuthenticatedUser = { id: missing, role: "ADMIN" };

    await expect(
      service.updateUser(missing, { nome: "X" }, admin)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lanca NotFoundError (nao 400) ao tentar alterar papel de um usuario inexistente", async () => {
    const missing = new mongoose.Types.ObjectId().toString();
    const admin: AuthenticatedUser = { id: missing, role: "ADMIN" };

    await expect(
      service.updateUser(missing, { papel: "ADMIN" }, admin)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita com ConflictError ao atualizar email diferindo so na caixa de um ja usado", async () => {
    await createUser({ email: "ocupado@example.com" });
    const user = await createUser({ email: "livre@example.com" });
    const requester: AuthenticatedUser = { id: user.id, role: "MEMBER" };

    await expect(
      service.updateUser(user.id, { email: "OCUPADO@EXAMPLE.COM" }, requester)
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("permite que o proprio usuario exclua sua conta", async () => {
    const user = await createUser();
    const requester: AuthenticatedUser = { id: user.id, role: "MEMBER" };

    await service.deleteUser(user.id, requester);

    expect(await repository.findById(user.id)).toBeUndefined();
  });

  it("lanca NotFoundError ao excluir um usuario inexistente", async () => {
    const missing = new mongoose.Types.ObjectId().toString();
    const admin: AuthenticatedUser = { id: missing, role: "ADMIN" };

    await expect(service.deleteUser(missing, admin)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita com ConflictError ao excluir usuario com emprestimo ATIVO", async () => {
    const user = await createUser();
    const bookId = new mongoose.Types.ObjectId().toString();
    await loansRepository.create({
      livroId: bookId,
      usuarioId: user.id,
      dataEmprestimo: new Date().toISOString(),
      dataPrevistaDevolucao: new Date().toISOString(),
      dataDevolucao: null,
      status: "ATIVO",
    });
    const requester: AuthenticatedUser = { id: user.id, role: "MEMBER" };

    await expect(service.deleteUser(user.id, requester)).rejects.toBeInstanceOf(ConflictError);
    expect(await repository.findById(user.id)).toBeDefined();
  });

  it("permite excluir usuario cujo unico emprestimo ja foi DEVOLVIDO", async () => {
    const user = await createUser();
    const bookId = new mongoose.Types.ObjectId().toString();
    await loansRepository.create({
      livroId: bookId,
      usuarioId: user.id,
      dataEmprestimo: new Date().toISOString(),
      dataPrevistaDevolucao: new Date().toISOString(),
      dataDevolucao: new Date().toISOString(),
      status: "DEVOLVIDO",
    });
    const requester: AuthenticatedUser = { id: user.id, role: "MEMBER" };

    await service.deleteUser(user.id, requester);
    expect(await repository.findById(user.id)).toBeUndefined();
  });
});
