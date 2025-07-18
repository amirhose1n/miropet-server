import jwt from "jsonwebtoken";

export const generateToken = (
  payload: object,
  secret: string,
  expiresIn: string = "7d"
): string => {
  return jwt.sign(payload, secret, { expiresIn } as any);
};

export const verifyToken = (token: string, secret: string): any => {
  return jwt.verify(token, secret);
};
