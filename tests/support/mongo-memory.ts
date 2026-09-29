import { afterAll, afterEach, beforeAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

/**
 * Sobe um MongoMemoryReplSet (nao MongoMemoryServer simples) e conecta o
 * mongoose antes da suite, limpa todas as collections apos cada teste, e
 * encerra a conexao e o servidor apos a suite.
 *
 * Replica set e obrigatorio: LoansService.create/returnLoan usam transacoes
 * Mongoose (session.withTransaction), que exigem um replica set — com
 * MongoMemoryServer simples, toda rota POST /loans e PATCH /loans/:id/return
 * falha com "Transaction numbers are only allowed on a replica set".
 */
export function useMongoMemoryReplSet(): void {
  let replset: MongoMemoryReplSet;

  beforeAll(async () => {
    replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replset.getUri());
  }, 60000);

  afterEach(async () => {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replset.stop();
  });
}
