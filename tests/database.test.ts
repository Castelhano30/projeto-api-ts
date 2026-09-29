import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";

describe("connectDatabase", () => {
  const originalUri = process.env.MONGODB_URI;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(async () => {
    process.env.MONGODB_URI = originalUri;
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    vi.restoreAllMocks();
  });

  it("lanca erro explicito quando MONGODB_URI nao esta configurada", async () => {
    delete process.env.MONGODB_URI;
    const { connectDatabase } = await import("../src/config/database");

    await expect(connectDatabase()).rejects.toThrow(/MONGODB_URI/);
  });

  it("conecta ao MongoDB quando MONGODB_URI esta configurada", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test-connect";
    const { connectDatabase } = await import("../src/config/database");

    const connectSpy = vi
      .spyOn(mongoose, "connect")
      .mockResolvedValue(mongoose as unknown as typeof mongoose);

    await connectDatabase();

    expect(connectSpy).toHaveBeenCalledWith("mongodb://localhost:27017/test-connect");
  });

  it("propaga erro com mensagem clara quando a conexao falha", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test-connect";
    const { connectDatabase } = await import("../src/config/database");

    vi.spyOn(mongoose, "connect").mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(connectDatabase()).rejects.toThrow(/Falha ao conectar ao MongoDB/);
  });
});
