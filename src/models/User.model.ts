import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name?: string;
  email?: string;
  phone: string;
  role: "customer" | "admin";
  isPhoneVerified: boolean;
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  name: String,
  email: {
    type: String,
    unique: false,
    sparse: true, // Allows multiple null values
  },
  phone: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    index: true, // This creates the index
  },
  role: { type: String, enum: ["customer", "admin"], default: "customer" },
  isPhoneVerified: { type: Boolean, default: false },
  refreshTokens: [{ type: String }], // Array of refresh tokens
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update the updatedAt field before saving
userSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const User = mongoose.model<IUser>("User", userSchema);
