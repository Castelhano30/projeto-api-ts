import mongoose from "mongoose";
import { LoansRepository } from "./loans.repository";
import { BooksService } from "../books/books.service";
import { CreateLoanDto } from "./loans.dto";
import { Loan } from "./loans.types";
import { AuthenticatedUser } from "../../middlewares/auth.middleware";
import { ForbiddenError, NotFoundError, ConflictError } from "../../utils/app-error";

export class LoansService {
  constructor(
    private readonly loansRepository: LoansRepository,
    private readonly booksService: BooksService
  ) {}

  async create(dto: CreateLoanDto, requester: AuthenticatedUser): Promise<Loan> {
    const book = await this.booksService.findById(dto.livroId);

    if (book.quantidadeDisponivel <= 0) {
      throw new ConflictError("Nao ha exemplares disponiveis para este livro");
    }

    const agora = new Date();
    const dataPrevista = new Date(agora);
    dataPrevista.setDate(dataPrevista.getDate() + dto.diasParaDevolucao);

    let session: mongoose.ClientSession | undefined;
    try {
      session = await mongoose.startSession();
      let loan: Loan | undefined;
      await session.withTransaction(async () => {
        await this.booksService.decrementAvailability(book.id, session);
        loan = await this.loansRepository.create(
          {
            livroId: book.id,
            usuarioId: requester.id,
            dataEmprestimo: agora.toISOString(),
            dataPrevistaDevolucao: dataPrevista.toISOString(),
            dataDevolucao: null,
            status: "ATIVO",
          },
          session
        );
      });
      return loan as Loan;
    } finally {
      await session?.endSession();
    }
  }

  async findAllForRequester(requester: AuthenticatedUser): Promise<Loan[]> {
    const loans =
      requester.role === "ADMIN"
        ? await this.loansRepository.findAll()
        : await this.loansRepository.findByUserId(requester.id);

    return Promise.all(loans.map((loan) => this.refreshStatus(loan)));
  }

  async findByIdForRequester(id: string, requester: AuthenticatedUser): Promise<Loan> {
    const loan = await this.loansRepository.findById(id);
    if (!loan) {
      throw new NotFoundError("Emprestimo nao encontrado");
    }

    if (requester.role !== "ADMIN" && loan.usuarioId !== requester.id) {
      throw new ForbiddenError("Voce nao tem acesso a este emprestimo");
    }

    return this.refreshStatus(loan);
  }

  async returnLoan(id: string, requester: AuthenticatedUser): Promise<Loan> {
    const loan = await this.findByIdForRequester(id, requester);

    if (loan.status === "DEVOLVIDO") {
      throw new ConflictError("Este emprestimo ja foi devolvido");
    }

    let session: mongoose.ClientSession | undefined;
    try {
      session = await mongoose.startSession();
      let updated: Loan | undefined;
      await session.withTransaction(async () => {
        await this.booksService.incrementAvailability(loan.livroId, session);
        updated = await this.loansRepository.update(
          loan.id,
          { dataDevolucao: new Date().toISOString(), status: "DEVOLVIDO" },
          session
        );
      });
      return updated as Loan;
    } finally {
      await session?.endSession();
    }
  }

  async hasActiveLoanForUser(userId: string): Promise<boolean> {
    const loans = await this.loansRepository.findByUserId(userId);
    return loans.some((loan) => loan.status === "ATIVO" || loan.status === "ATRASADO");
  }

  private async refreshStatus(loan: Loan): Promise<Loan> {
    if (loan.status === "ATIVO" && new Date(loan.dataPrevistaDevolucao) < new Date()) {
      const updated = await this.loansRepository.update(loan.id, { status: "ATRASADO" });
      return updated ?? loan;
    }
    return loan;
  }
}
