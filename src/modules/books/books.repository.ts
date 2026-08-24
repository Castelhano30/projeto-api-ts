import { randomUUID } from "crypto";
import { store } from "../../repositories/in-memory-store";
import { Book } from "./books.types";

export class BooksRepository {
  create(data: Omit<Book, "id">): Book {
    const book: Book = { id: randomUUID(), ...data };
    store.books.set(book.id, book);
    return book;
  }

  findById(id: string): Book | undefined {
    return store.books.get(id);
  }

  findByIsbn(isbn: string): Book | undefined {
    return [...store.books.values()].find((b) => b.isbn === isbn);
  }

  findAll(): Book[] {
    return [...store.books.values()];
  }

  update(id: string, data: Partial<Omit<Book, "id">>): Book | undefined {
    const existing = store.books.get(id);
    if (!existing) return undefined;
    const updated: Book = { ...existing, ...data };
    store.books.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return store.books.delete(id);
  }
}
