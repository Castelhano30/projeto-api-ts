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

  create(dto: CreateLoanDto, requester: AuthenticatedUser): Loan {
    const book = this.booksService.findById(dto.livroId);

    if (book.quantidadeDisponivel <= 0) {
      throw new ConflictError("Nao ha exemplares disponiveis para este livro");
    }

    this.booksService.decrementAvailability(book.id);

    const agora = new Date();
    const dataPrevista = new Date(agora);
    dataPrevista.setDate(dataPrevista.getDate() + dto.diasParaDevolucao);

    return this.loansRepository.create({
      livroId: book.id,
      usuarioId: requester.id,
      dataEmprestimo: agora.toISOString(),
      dataPrevistaDevolucao: dataPrevista.toISOString(),
      dataDevolucao: null,
      status: "ATIVO",
    });
  }

  findAllForRequester(requester: AuthenticatedUser): Loan[] {
    const loans =
      requester.role === "ADMIN"
        ? this.loansRepository.findAll()
        : this.loansRepository.findByUserId(requester.id);

    return loans.map((loan) => this.refreshStatus(loan));
  }

  findByIdForRequester(id: string, requester: AuthenticatedUser): Loan {
    const loan = this.loansRepository.findById(id);
    if (!loan) {
      throw new NotFoundError("Emprestimo nao encontrado");
    }

    if (requester.role !== "ADMIN" && loan.usuarioId !== requester.id) {
      throw new ForbiddenError("Voce nao tem acesso a este emprestimo");
    }

    return this.refreshStatus(loan);
  }

  returnLoan(id: string, requester: AuthenticatedUser): Loan {
    const loan = this.findByIdForRequester(id, requester);

    if (loan.status === "DEVOLVIDO") {
      throw new ConflictError("Este emprestimo ja foi devolvido");
    }

    this.booksService.incrementAvailability(loan.livroId);

    const updated = this.loansRepository.update(loan.id, {
      dataDevolucao: new Date().toISOString(),
      status: "DEVOLVIDO",
    });

    return updated as Loan;
  }

  private refreshStatus(loan: Loan): Loan {
    if (loan.status === "ATIVO" && new Date(loan.dataPrevistaDevolucao) < new Date()) {
      const updated = this.loansRepository.update(loan.id, { status: "ATRASADO" });
      return updated as Loan;
    }
    return loan;
  }
}
