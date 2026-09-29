import bcrypt from "bcrypt";
import { UsersService } from "../users/users.service";
import { LoginDto, RegisterDto } from "./auth.dto";
import { signToken } from "../../config/jwt";
import { UnauthorizedError } from "../../utils/app-error";
import { PublicUser } from "../users/users.types";

export interface AuthResult {
  token: string;
  user: PublicUser;
}

export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async register(dto: RegisterDto): Promise<PublicUser> {
    return this.usersService.createUser(dto);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmailWithHash(dto.email);
    if (!user) {
      throw new UnauthorizedError("Credenciais invalidas");
    }

    const senhaValida = await bcrypt.compare(dto.senha, user.senhaHash);
    if (!senhaValida) {
      throw new UnauthorizedError("Credenciais invalidas");
    }

    const token = signToken({ sub: user.id, role: user.papel });
    const { senhaHash: _senhaHash, ...publicUser } = user;

    return { token, user: publicUser };
  }
}
