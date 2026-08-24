import { Request, Response } from "express";
import { UsersService } from "./users.service";

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  list = (_req: Request, res: Response): void => {
    res.status(200).json(this.usersService.listAll());
  };
}
