import { model, Schema, Types } from "mongoose";
import { LoanStatus } from "./loans.types";

export interface LoanDocument {
  livroId: Types.ObjectId;
  usuarioId: Types.ObjectId;
  dataEmprestimo: string;
  dataPrevistaDevolucao: string;
  dataDevolucao: string | null;
  status: LoanStatus;
}

const loanSchema = new Schema<LoanDocument>(
  {
    livroId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    usuarioId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dataEmprestimo: { type: String, required: true },
    dataPrevistaDevolucao: { type: String, required: true },
    dataDevolucao: { type: String, default: null },
    status: { type: String, required: true, enum: ["ATIVO", "DEVOLVIDO", "ATRASADO"] },
  },
  { versionKey: false }
);

export const LoanModel = model<LoanDocument>("Loan", loanSchema);
