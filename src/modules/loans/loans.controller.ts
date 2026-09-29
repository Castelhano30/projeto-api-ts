import { Request, Response } from "express";
import { LoansService } from "./loans.service";
import { CreateLoanDto } from "./loans.dto";
import { requireAuthenticatedUser } from "../../middlewares/role.middleware";

export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as CreateLoanDto;
    const loan = await this.loansService.create(dto, requireAuthenticatedUser(req));
    res.status(201).json(loan);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const loans = await this.loansService.findAllForRequester(requireAuthenticatedUser(req));
    res.status(200).json(loans);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const loan = await this.loansService.findByIdForRequester(
      req.params.id,
      requireAuthenticatedUser(req)
    );
    res.status(200).json(loan);
  };

  returnLoan = async (req: Request, res: Response): Promise<void> => {
    const loan = await this.loansService.returnLoan(req.params.id, requireAuthenticatedUser(req));
    res.status(200).json(loan);
  };
}
