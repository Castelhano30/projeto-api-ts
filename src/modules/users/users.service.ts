import bcrypt from "bcrypt";
import { UsersRepository } from "./users.repository";
import { CreateUserDto } from "./users.dto";
import { PublicUser, User } from "./users.types";
import { ConflictError } from "../../utils/app-error";
import { isDuplicateKeyError } from "../../utils/mongo-errors";

const SALT_ROUNDS = 10;

function toPublicUser(user: User): PublicUser {
  const { senhaHash, ...publicUser } = user;
  return publicUser;
}

export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

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
}
