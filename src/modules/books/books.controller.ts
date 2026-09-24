import { Request, Response } from "express";
import { BooksService } from "./books.service";
import { CreateBookDto, UpdateBookDto } from "./books.dto";

export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as CreateBookDto;
    const book = await this.booksService.create(dto);
    res.status(201).json(book);
  };

  list = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.booksService.findAll());
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const book = await this.booksService.findById(req.params.id);
    res.status(200).json(book);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as UpdateBookDto;
    const book = await this.booksService.update(req.params.id, dto);
    res.status(200).json(book);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.booksService.delete(req.params.id);
    res.status(204).send();
  };
}
