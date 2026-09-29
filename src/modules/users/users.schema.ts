import { model, Schema } from "mongoose";
import { UserRole } from "./users.types";

export interface UserDocument {
  nome: string;
  email: string;
  senhaHash: string;
  papel: UserRole;
}

const userSchema = new Schema<UserDocument>(
  {
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    senhaHash: { type: String, required: true },
    papel: { type: String, required: true, enum: ["ADMIN", "MEMBER"] },
  },
  { versionKey: false }
);

export const UserModel = model<UserDocument>("User", userSchema);
