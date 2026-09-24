import { model, Schema } from "mongoose";

export interface BookDocument {
  titulo: string;
  autor: string;
  isbn: string;
  quantidadeTotal: number;
  quantidadeDisponivel: number;
}

const bookSchema = new Schema<BookDocument>(
  {
    titulo: { type: String, required: true },
    autor: { type: String, required: true },
    isbn: { type: String, required: true, unique: true },
    quantidadeTotal: { type: Number, required: true },
    quantidadeDisponivel: { type: Number, required: true },
  },
  { versionKey: false }
);

export const BookModel = model<BookDocument>("Book", bookSchema);
