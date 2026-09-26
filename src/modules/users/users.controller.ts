import { Request, Response } from "express";
import { UsersService } from "./users.service";
import { UpdateUserDto } from "./users.dto";
import { requireAuthenticatedUser } from "../../middlewares/role.middleware";

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.usersService.listAll());
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const requester = requireAuthenticatedUser(req);
    const dto = req.body as UpdateUserDto;
    const user = await this.usersService.updateUser(req.params.id, dto, requester);
    res.status(200).json(user);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const requester = requireAuthenticatedUser(req);
    await this.usersService.deleteUser(req.params.id, requester);
    res.status(204).send();
  };
}
