import { z } from "zod";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export function objectIdSchema(message = "ID invalido"): z.ZodString {
  return z.string().regex(OBJECT_ID_REGEX, message);
}
