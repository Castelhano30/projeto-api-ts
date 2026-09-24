import { Request, Response } from "express";
import { UsersService } from "./users.service";

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.usersService.listAll());
  };
}
