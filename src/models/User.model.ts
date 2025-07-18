import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name?: string;
  email: string;
  passwordHash: string;
  role: "customer" | "admin";
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  name: String,
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["customer", "admin"], default: "customer" },
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model<IUser>("User", userSchema);
