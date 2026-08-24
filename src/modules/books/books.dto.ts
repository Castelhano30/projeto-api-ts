import { z } from "zod";

export const createBookSchema = z.object({
  body: z.object({
    titulo: z.string().min(1, "Titulo e obrigatorio"),
    autor: z.string().min(1, "Autor e obrigatorio"),
    isbn: z.string().min(1, "ISBN e obrigatorio"),
    quantidadeTotal: z.number().int().min(1, "Quantidade total deve ser ao menos 1"),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateBookSchema = z.object({
  body: z
    .object({
      titulo: z.string().min(1).optional(),
      autor: z.string().min(1).optional(),
      isbn: z.string().min(1).optional(),
      quantidadeTotal: z.number().int().min(1).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "Informe ao menos um campo para atualizar",
    }),
  params: z.object({
    id: z.string().uuid("ID invalido"),
  }),
  query: z.object({}).optional(),
});

export const bookIdParamSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid("ID invalido"),
  }),
  query: z.object({}).optional(),
});

export type CreateBookDto = z.infer<typeof createBookSchema>["body"];
export type UpdateBookDto = z.infer<typeof updateBookSchema>["body"];
