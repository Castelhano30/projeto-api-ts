import { randomUUID } from "crypto";
import { store } from "../../repositories/in-memory-store";
import { Loan } from "./loans.types";

export class LoansRepository {
  create(data: Omit<Loan, "id">): Loan {
    const loan: Loan = { id: randomUUID(), ...data };
    store.loans.set(loan.id, loan);
    return loan;
  }

  findById(id: string): Loan | undefined {
    return store.loans.get(id);
  }

  findAll(): Loan[] {
    return [...store.loans.values()];
  }

  findByUserId(userId: string): Loan[] {
    return [...store.loans.values()].filter((l) => l.usuarioId === userId);
  }

  update(id: string, data: Partial<Omit<Loan, "id">>): Loan | undefined {
    const existing = store.loans.get(id);
    if (!existing) return undefined;
    const updated: Loan = { ...existing, ...data };
    store.loans.set(id, updated);
    return updated;
  }
}
