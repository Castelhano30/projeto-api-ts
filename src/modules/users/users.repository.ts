import { UserModel } from "./users.schema";
import { User } from "./users.types";
import { findOrUndefined } from "../../utils/mongo-errors";

function toUser(doc: { _id: unknown; nome: string; email: string; senhaHash: string; papel: User["papel"] }): User {
  return {
    id: String(doc._id),
    nome: doc.nome,
    email: doc.email,
    senhaHash: doc.senhaHash,
    papel: doc.papel,
  };
}

function normalizeEmail(email: string): string {
  return email.toLowerCase();
}

export class UsersRepository {
  async create(data: Omit<User, "id">): Promise<User> {
    const user = await UserModel.create({ ...data, email: normalizeEmail(data.email) });
    return toUser(user);
  }

  async findById(id: string): Promise<User | undefined> {
    const user = await findOrUndefined(UserModel.findById(id));
    return user ? toUser(user) : undefined;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ email: normalizeEmail(email) });
    return user ? toUser(user) : undefined;
  }

  async findAll(): Promise<User[]> {
    const users = await UserModel.find();
    return users.map(toUser);
  }

  async update(id: string, data: Partial<Omit<User, "id">>): Promise<User | undefined> {
    const normalizedData = data.email ? { ...data, email: normalizeEmail(data.email) } : data;
    const user = await findOrUndefined(
      UserModel.findByIdAndUpdate(id, normalizedData, { returnDocument: "after" })
    );
    return user ? toUser(user) : undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await findOrUndefined(UserModel.findByIdAndDelete(id));
    return result !== undefined;
  }
}
