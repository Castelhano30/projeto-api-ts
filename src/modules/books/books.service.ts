import { ClientSession } from "mongoose";
import { BooksRepository } from "./books.repository";
import { CreateBookDto, UpdateBookDto } from "./books.dto";
import { Book } from "./books.types";
import { ConflictError, NotFoundError } from "../../utils/app-error";
import { isDuplicateKeyError } from "../../utils/mongo-errors";

export class BooksService {
  constructor(private readonly booksRepository: BooksRepository) {}

  async create(dto: CreateBookDto): Promise<Book> {
    const existing = await this.booksRepository.findByIsbn(dto.isbn);
    if (existing) {
      throw new ConflictError("Ja existe um livro cadastrado com este ISBN");
    }

    try {
      return await this.booksRepository.create({
        titulo: dto.titulo,
        autor: dto.autor,
        isbn: dto.isbn,
        quantidadeTotal: dto.quantidadeTotal,
        quantidadeDisponivel: dto.quantidadeTotal,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictError("Ja existe um livro cadastrado com este ISBN");
      }
      throw error;
    }
  }

  findAll(): Promise<Book[]> {
    return this.booksRepository.findAll();
  }

  async findById(id: string, session?: ClientSession): Promise<Book> {
    const book = await this.booksRepository.findById(id, session);
    if (!book) {
      throw new NotFoundError("Livro nao encontrado");
    }
    return book;
  }

  async update(id: string, dto: UpdateBookDto): Promise<Book> {
    await this.findById(id);

    if (dto.isbn) {
      const existing = await this.booksRepository.findByIsbn(dto.isbn);
      if (existing && existing.id !== id) {
        throw new ConflictError("Ja existe um livro cadastrado com este ISBN");
      }
    }

    const updated = await this.booksRepository.update(id, dto);
    if (!updated) {
      throw new NotFoundError("Livro nao encontrado");
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.booksRepository.delete(id);
  }

  async decrementAvailability(id: string, session?: ClientSession): Promise<Book> {
    const updated = await this.booksRepository.decrementAvailabilityIfAvailable(id, session);
    if (!updated) {
      const book = await this.findById(id, session);
      if (book.quantidadeDisponivel <= 0) {
        throw new ConflictError("Nao ha exemplares disponiveis para este livro");
      }
      throw new NotFoundError("Livro nao encontrado");
    }
    return updated;
  }

  async incrementAvailability(id: string, session?: ClientSession): Promise<Book> {
    const updated = await this.booksRepository.incrementAvailability(id, session);
    if (!updated) {
      throw new NotFoundError("Livro nao encontrado");
    }
    return updated;
  }
}
