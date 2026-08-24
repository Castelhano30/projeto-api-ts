import { User } from "../modules/users/users.types";
import { Book } from "../modules/books/books.types";
import { Loan } from "../modules/loans/loans.types";

class InMemoryStore {
  public readonly users: Map<string, User> = new Map();
  public readonly books: Map<string, Book> = new Map();
  public readonly loans: Map<string, Loan> = new Map();
}

export const store = new InMemoryStore();
