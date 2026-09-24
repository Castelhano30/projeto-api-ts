import { ClientSession } from "mongoose";
import { BookModel } from "./books.schema";
import { Book } from "./books.types";
import { findOrUndefined } from "../../utils/mongo-errors";

function toBook(doc: { _id: unknown; titulo: string; autor: string; isbn: string; quantidadeTotal: number; quantidadeDisponivel: number }): Book {
  return {
    id: String(doc._id),
    titulo: doc.titulo,
    autor: doc.autor,
    isbn: doc.isbn,
    quantidadeTotal: doc.quantidadeTotal,
    quantidadeDisponivel: doc.quantidadeDisponivel,
  };
}

export class BooksRepository {
  async create(data: Omit<Book, "id">): Promise<Book> {
    const book = await BookModel.create(data);
    return toBook(book);
  }

  async findById(id: string, session?: ClientSession): Promise<Book | undefined> {
    const book = await findOrUndefined(BookModel.findById(id).session(session ?? null));
    return book ? toBook(book) : undefined;
  }

  async findByIsbn(isbn: string): Promise<Book | undefined> {
    const book = await BookModel.findOne({ isbn });
    return book ? toBook(book) : undefined;
  }

  async findAll(): Promise<Book[]> {
    const books = await BookModel.find();
    return books.map(toBook);
  }

  async update(id: string, data: Partial<Omit<Book, "id">>): Promise<Book | undefined> {
    const book = await findOrUndefined(
      BookModel.findByIdAndUpdate(id, data, { returnDocument: "after" })
    );
    return book ? toBook(book) : undefined;
  }

  /**
   * Decrementa quantidadeDisponivel de forma atomica, condicionada a haver
   * ao menos 1 exemplar disponivel no momento da escrita no banco. Evita a
   * corrida de duas requisicoes concorrentes lendo o mesmo valor e ambas
   * decrementando com sucesso (overbooking).
   */
  async decrementAvailabilityIfAvailable(
    id: string,
    session?: ClientSession
  ): Promise<Book | undefined> {
    const book = await findOrUndefined(
      BookModel.findOneAndUpdate(
        { _id: id, quantidadeDisponivel: { $gt: 0 } },
        { $inc: { quantidadeDisponivel: -1 } },
        { returnDocument: "after", session }
      )
    );
    return book ? toBook(book) : undefined;
  }

  /**
   * Incrementa quantidadeDisponivel de forma atomica, sem ultrapassar
   * quantidadeTotal, usando um pipeline de update ($min) para evitar a
   * mesma classe de corrida do decremento (duas devolucoes concorrentes
   * lendo o mesmo valor e uma sobrescrevendo a outra).
   */
  async incrementAvailability(id: string, session?: ClientSession): Promise<Book | undefined> {
    const book = await findOrUndefined(
      BookModel.findOneAndUpdate(
        { _id: id },
        [
          {
            $set: {
              quantidadeDisponivel: {
                $min: [{ $add: ["$quantidadeDisponivel", 1] }, "$quantidadeTotal"],
              },
            },
          },
        ],
        { returnDocument: "after", updatePipeline: true, session }
      )
    );
    return book ? toBook(book) : undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await findOrUndefined(BookModel.findByIdAndDelete(id));
    return result !== undefined;
  }
}
