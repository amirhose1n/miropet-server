import crypto from "crypto";
import jwt from "jsonwebtoken";

export const generateToken = (
  payload: object,
  secret: string,
  expiresIn: string = "15m" // Short-lived access token
): string => {
  return jwt.sign(payload, secret, { expiresIn } as any);
};

export const generateRefreshToken = (): string => {
  return crypto.randomBytes(64).toString("hex");
};

export const verifyToken = (token: string, secret: string): any => {
  return jwt.verify(token, secret);
};

export const generateTokenPair = (payload: object, secret: string) => {
  const accessToken = generateToken(payload, secret, "15m"); // 15 minutes
  const refreshToken = generateRefreshToken();

  return {
    accessToken,
    refreshToken,
  };
};
