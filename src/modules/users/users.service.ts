import bcrypt from "bcrypt";
import { UsersRepository } from "./users.repository";
import { CreateUserDto, UpdateUserDto } from "./users.dto";
import { PublicUser, User } from "./users.types";
import { AppError, ConflictError, NotFoundError } from "../../utils/app-error";
import { isDuplicateKeyError } from "../../utils/mongo-errors";
import { AuthenticatedUser } from "../../middlewares/auth.middleware";
import { LoansService } from "../loans/loans.service";

const SALT_ROUNDS = 10;

function toPublicUser(user: User): PublicUser {
  const { senhaHash, ...publicUser } = user;
  return publicUser;
}

export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly loansService: LoansService
  ) {}

  async createUser(dto: CreateUserDto): Promise<PublicUser> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError("Email ja cadastrado");
    }

    const senhaHash = await bcrypt.hash(dto.senha, SALT_ROUNDS);

    try {
      const user = await this.usersRepository.create({
        nome: dto.nome,
        email: dto.email,
        senhaHash,
        papel: dto.papel,
      });
      return toPublicUser(user);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictError("Email ja cadastrado");
      }
      throw error;
    }
  }

  findByEmailWithHash(email: string): Promise<User | undefined> {
    return this.usersRepository.findByEmail(email);
  }

  async findPublicById(id: string): Promise<PublicUser | undefined> {
    const user = await this.usersRepository.findById(id);
    return user ? toPublicUser(user) : undefined;
  }

  async listAll(): Promise<PublicUser[]> {
    const users = await this.usersRepository.findAll();
    return users.map(toPublicUser);
  }

  async updateUser(id: string, dto: UpdateUserDto, requester: AuthenticatedUser): Promise<PublicUser> {
    const existing = await this.usersRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Usuario nao encontrado");
    }

    if (dto.papel !== undefined && requester.role !== "ADMIN") {
      throw new AppError("Somente ADMIN pode alterar o papel do usuario", 400);
    }

    if (dto.email) {
      const existingByEmail = await this.usersRepository.findByEmail(dto.email);
      if (existingByEmail && existingByEmail.id !== id) {
        throw new ConflictError("Email ja cadastrado");
      }
    }

    const { senha, ...rest } = dto;
    const data: Partial<Omit<User, "id">> = { ...rest };
    if (senha) {
      data.senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
    }

    try {
      const updated = await this.usersRepository.update(id, data);
      if (!updated) {
        throw new NotFoundError("Usuario nao encontrado");
      }
      return toPublicUser(updated);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictError("Email ja cadastrado");
      }
      throw error;
    }
  }

  async deleteUser(id: string, _requester: AuthenticatedUser): Promise<void> {
    const existing = await this.usersRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Usuario nao encontrado");
    }

    const hasActiveLoan = await this.loansService.hasActiveLoanForUser(id);
    if (hasActiveLoan) {
      throw new ConflictError("Usuario possui emprestimo ativo e nao pode ser excluido");
    }

    await this.usersRepository.delete(id);
  }
}
