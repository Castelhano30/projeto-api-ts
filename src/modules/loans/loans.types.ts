export type LoanStatus = "ATIVO" | "DEVOLVIDO" | "ATRASADO";

export interface Loan {
  id: string;
  livroId: string;
  usuarioId: string;
  dataEmprestimo: string;
  dataPrevistaDevolucao: string;
  dataDevolucao: string | null;
  status: LoanStatus;
}
