import { Request, Response } from "express";
import { LoansService } from "./loans.service";
import { CreateLoanDto } from "./loans.dto";
import { UnauthorizedError } from "../../utils/app-error";

function requireUser(req: Request) {
  if (!req.user) {
    throw new UnauthorizedError("Nao autenticado");
  }
  return req.user;
}

export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  create = (req: Request, res: Response): void => {
    const dto = req.body as CreateLoanDto;
    const loan = this.loansService.create(dto, requireUser(req));
    res.status(201).json(loan);
  };

  list = (req: Request, res: Response): void => {
    const loans = this.loansService.findAllForRequester(requireUser(req));
    res.status(200).json(loans);
  };

  getById = (req: Request, res: Response): void => {
    const loan = this.loansService.findByIdForRequester(req.params.id, requireUser(req));
    res.status(200).json(loan);
  };

  returnLoan = (req: Request, res: Response): void => {
    const loan = this.loansService.returnLoan(req.params.id, requireUser(req));
    res.status(200).json(loan);
  };
}
