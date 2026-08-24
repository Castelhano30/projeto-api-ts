import { Request, Response } from "express";
import { BooksService } from "./books.service";
import { CreateBookDto, UpdateBookDto } from "./books.dto";

export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  create = (req: Request, res: Response): void => {
    const dto = req.body as CreateBookDto;
    const book = this.booksService.create(dto);
    res.status(201).json(book);
  };

  list = (_req: Request, res: Response): void => {
    res.status(200).json(this.booksService.findAll());
  };

  getById = (req: Request, res: Response): void => {
    const book = this.booksService.findById(req.params.id);
    res.status(200).json(book);
  };

  update = (req: Request, res: Response): void => {
    const dto = req.body as UpdateBookDto;
    const book = this.booksService.update(req.params.id, dto);
    res.status(200).json(book);
  };

  delete = (req: Request, res: Response): void => {
    this.booksService.delete(req.params.id);
    res.status(204).send();
  };
}
