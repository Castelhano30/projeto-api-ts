export type UserRole = "ADMIN" | "MEMBER";

export interface User {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  papel: UserRole;
}

export type PublicUser = Omit<User, "senhaHash">;
