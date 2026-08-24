import { z } from "zod";

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

export type CreateUserDto = z.infer<typeof createUserSchema>["body"];
