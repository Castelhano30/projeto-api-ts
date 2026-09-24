import mongoose from "mongoose";

/**
 * Executa uma operacao Mongoose que busca/atualiza/remove por id e trata um
 * CastError (id em formato invalido, ex.: nao e um ObjectId) como "nao
 * encontrado". Qualquer outro erro (conexao, timeout, etc.) e propagado.
 */
export async function findOrUndefined<T>(operation: Promise<T | null>): Promise<T | undefined> {
  try {
    const result = await operation;
    return result ?? undefined;
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) {
      return undefined;
    }
    throw error;
  }
}

export const DUPLICATE_KEY_ERROR_CODE = 11000;

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === DUPLICATE_KEY_ERROR_CODE
  );
}
