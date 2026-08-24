import { randomUUID } from "crypto";
import { store } from "../../repositories/in-memory-store";
import { User } from "./users.types";

export class UsersRepository {
  create(data: Omit<User, "id">): User {
    const user: User = { id: randomUUID(), ...data };
    store.users.set(user.id, user);
    return user;
  }

  findById(id: string): User | undefined {
    return store.users.get(id);
  }

  findByEmail(email: string): User | undefined {
    return [...store.users.values()].find((u) => u.email === email);
  }

  findAll(): User[] {
    return [...store.users.values()];
  }
}
