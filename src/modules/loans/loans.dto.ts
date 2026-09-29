import { z } from "zod";
import { objectIdSchema } from "../../utils/object-id.dto";

export const createLoanSchema = z.object({
  body: z.object({
    livroId: objectIdSchema("ID de livro invalido"),
    diasParaDevolucao: z.number().int().min(1).max(90).default(14),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const loanIdParamSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: objectIdSchema(),
  }),
  query: z.object({}).optional(),
});

export type CreateLoanDto = z.infer<typeof createLoanSchema>["body"];
