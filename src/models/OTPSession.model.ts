import mongoose, { Document, Schema } from "mongoose";

export interface IOTPSession extends Document {
  phone: string;
  otp: string;
  attempts: number;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

const otpSessionSchema = new Schema<IOTPSession>({
  phone: {
    type: String,
    required: true,
    index: true,
  },
  otp: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3, // Maximum 3 attempts
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // TTL index
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const OTPSession = mongoose.model<IOTPSession>(
  "OTPSession",
  otpSessionSchema
);
