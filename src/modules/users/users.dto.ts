import { z } from "zod";
import { objectIdSchema } from "../../utils/object-id.dto";

export const createUserSchema = z.object({
  body: z.object({
    nome: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
    email: z.string().email("Email invalido"),
    senha: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
    papel: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateUserSchema = z.object({
  body: z
    .object({
      nome: z.string().min(2, "Nome deve ter ao menos 2 caracteres").optional(),
      email: z.string().email("Email invalido").optional(),
      senha: z.string().min(6, "Senha deve ter ao menos 6 caracteres").optional(),
      papel: z.enum(["ADMIN", "MEMBER"]).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "Informe ao menos um campo para atualizar",
    }),
  params: z.object({
    id: objectIdSchema(),
  }),
  query: z.object({}).optional(),
});

export const userIdParamSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: objectIdSchema(),
  }),
  query: z.object({}).optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>["body"];
export type UpdateUserDto = z.infer<typeof updateUserSchema>["body"];
