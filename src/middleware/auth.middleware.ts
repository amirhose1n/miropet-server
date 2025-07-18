import { NextFunction, Request, Response } from "express";
import { IUser, User } from "../models/User.model";
import { verifyToken } from "../utils/jwt.utils";

export interface AuthRequest extends Request {
  user?: IUser;
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Access token required",
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({
        success: false,
        message: "JWT secret not configured",
      });
      return;
    }

    const decoded = verifyToken(token, jwtSecret) as { userId: string };
    const user = await User.findById(decoded.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid token",
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: "Invalid or expired token",
    });
    return;
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      // No token provided, but that's okay for optional auth
      next();
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      // If JWT secret is not configured, continue without auth
      next();
      return;
    }

    const decoded = verifyToken(token, jwtSecret) as { userId: string };
    const user = await User.findById(decoded.userId);

    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Token is invalid, but for optional auth we just continue without user
    next();
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({
      success: false,
      message: "Admin access required",
    });
    return;
  }

  next();
};

export const requireCustomerOrAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  if (!["customer", "admin"].includes(req.user.role)) {
    res.status(403).json({
      success: false,
      message: "Access denied",
    });
    return;
  }

  next();
};

// Aliases for easier imports
export const auth = authenticateToken;
export const adminAuth = [authenticateToken, requireAdmin];
export const customerAuth = [authenticateToken, requireCustomerOrAdmin];
