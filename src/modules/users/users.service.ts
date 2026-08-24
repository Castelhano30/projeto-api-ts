import bcrypt from "bcrypt";
import { UsersRepository } from "./users.repository";
import { CreateUserDto } from "./users.dto";
import { PublicUser, User } from "./users.types";
import { ConflictError } from "../../utils/app-error";

const SALT_ROUNDS = 10;

function toPublicUser(user: User): PublicUser {
  const { senhaHash, ...publicUser } = user;
  return publicUser;
}

export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(dto: CreateUserDto): Promise<PublicUser> {
    const existing = this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError("Email ja cadastrado");
    }

    const senhaHash = await bcrypt.hash(dto.senha, SALT_ROUNDS);
    const user = this.usersRepository.create({
      nome: dto.nome,
      email: dto.email,
      senhaHash,
      papel: dto.papel,
    });

    return toPublicUser(user);
  }

  findByEmailWithHash(email: string): User | undefined {
    return this.usersRepository.findByEmail(email);
  }

  findPublicById(id: string): PublicUser | undefined {
    const user = this.usersRepository.findById(id);
    return user ? toPublicUser(user) : undefined;
  }

  listAll(): PublicUser[] {
    return this.usersRepository.findAll().map(toPublicUser);
  }
}
