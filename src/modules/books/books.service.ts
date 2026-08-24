import { BooksRepository } from "./books.repository";
import { CreateBookDto, UpdateBookDto } from "./books.dto";
import { Book } from "./books.types";
import { ConflictError, NotFoundError } from "../../utils/app-error";

export class BooksService {
  constructor(private readonly booksRepository: BooksRepository) {}

  create(dto: CreateBookDto): Book {
    const existing = this.booksRepository.findByIsbn(dto.isbn);
    if (existing) {
      throw new ConflictError("Ja existe um livro cadastrado com este ISBN");
    }

    return this.booksRepository.create({
      titulo: dto.titulo,
      autor: dto.autor,
      isbn: dto.isbn,
      quantidadeTotal: dto.quantidadeTotal,
      quantidadeDisponivel: dto.quantidadeTotal,
    });
  }

  findAll(): Book[] {
    return this.booksRepository.findAll();
  }

  findById(id: string): Book {
    const book = this.booksRepository.findById(id);
    if (!book) {
      throw new NotFoundError("Livro nao encontrado");
    }
    return book;
  }

  update(id: string, dto: UpdateBookDto): Book {
    this.findById(id);

    if (dto.isbn) {
      const existing = this.booksRepository.findByIsbn(dto.isbn);
      if (existing && existing.id !== id) {
        throw new ConflictError("Ja existe um livro cadastrado com este ISBN");
      }
    }

    const updated = this.booksRepository.update(id, dto);
    if (!updated) {
      throw new NotFoundError("Livro nao encontrado");
    }
    return updated;
  }

  delete(id: string): void {
    this.findById(id);
    this.booksRepository.delete(id);
  }

  decrementAvailability(id: string): Book {
    const book = this.findById(id);
    if (book.quantidadeDisponivel <= 0) {
      throw new ConflictError("Nao ha exemplares disponiveis para este livro");
    }
    const updated = this.booksRepository.update(id, {
      quantidadeDisponivel: book.quantidadeDisponivel - 1,
    });
    return updated as Book;
  }

  incrementAvailability(id: string): Book {
    const book = this.findById(id);
    const novaQuantidade = Math.min(book.quantidadeDisponivel + 1, book.quantidadeTotal);
    const updated = this.booksRepository.update(id, {
      quantidadeDisponivel: novaQuantidade,
    });
    return updated as Book;
  }
}
