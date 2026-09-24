import mongoose from "mongoose";

export async function connectDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI nao configurada. Defina a variavel de ambiente MONGODB_URI com a string de conexao do MongoDB antes de iniciar a aplicacao."
    );
  }

  try {
    return await mongoose.connect(uri);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Falha ao conectar ao MongoDB: ${reason}`);
  }
}
