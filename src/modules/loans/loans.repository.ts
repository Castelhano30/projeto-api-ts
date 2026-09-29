import mongoose, { ClientSession } from "mongoose";
import { LoanModel } from "./loans.schema";
import { Loan } from "./loans.types";
import { findOrUndefined } from "../../utils/mongo-errors";

function toLoan(doc: {
  _id: unknown;
  livroId: unknown;
  usuarioId: unknown;
  dataEmprestimo: string;
  dataPrevistaDevolucao: string;
  dataDevolucao: string | null;
  status: Loan["status"];
}): Loan {
  return {
    id: String(doc._id),
    livroId: String(doc.livroId),
    usuarioId: String(doc.usuarioId),
    dataEmprestimo: doc.dataEmprestimo,
    dataPrevistaDevolucao: doc.dataPrevistaDevolucao,
    dataDevolucao: doc.dataDevolucao,
    status: doc.status,
  };
}

export class LoansRepository {
  async create(data: Omit<Loan, "id">, session?: ClientSession): Promise<Loan> {
    const [loan] = await LoanModel.create([data], { session });
    return toLoan(loan);
  }

  async findById(id: string): Promise<Loan | undefined> {
    const loan = await findOrUndefined(LoanModel.findById(id));
    return loan ? toLoan(loan) : undefined;
  }

  async findAll(): Promise<Loan[]> {
    const loans = await LoanModel.find();
    return loans.map(toLoan);
  }

  async findByUserId(userId: string): Promise<Loan[]> {
    try {
      const loans = await LoanModel.find({ usuarioId: userId });
      return loans.map(toLoan);
    } catch (error) {
      if (error instanceof mongoose.Error.CastError) {
        return [];
      }
      throw error;
    }
  }

  async update(
    id: string,
    data: Partial<Omit<Loan, "id">>,
    session?: ClientSession
  ): Promise<Loan | undefined> {
    const loan = await findOrUndefined(
      LoanModel.findByIdAndUpdate(id, data, { returnDocument: "after", session })
    );
    return loan ? toLoan(loan) : undefined;
  }
}
