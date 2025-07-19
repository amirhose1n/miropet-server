import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth.middleware";
import { createError } from "../middleware/error.middleware";
import { User } from "../models/User.model";
import { generateToken } from "../utils/jwt.utils";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
      return;
    }

    const { name, email, password } = req.body;

    // Only allow customer registration through this endpoint
    const role = "customer";

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "کاربر با این ایمیل قبلا ثبت نام کرده است",
      });
      return;
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      name,
      email,
      passwordHash,
      role,
    });

    await user.save();

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw createError("JWT secret not configured", 500);
    }

    const payload = { userId: String(user._id) };
    const token = generateToken(
      payload,
      jwtSecret,
      process.env.JWT_EXPIRES_IN || "7d"
    );

    res.status(201).json({
      success: true,
      message: "Customer registered successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
        token,
      },
    });
    return;
  } catch (error) {
    console.error("Registration error:", error);

    // Handle different types of errors
    let errorMessage = "Registration failed";
    let errorDetails = null;

    if (error instanceof Error) {
      errorMessage = error.message;
      if (process.env.NODE_ENV === "development") {
        errorDetails = {
          message: error.message,
          stack: error.stack,
          name: error.name,
        };
      }
    } else if (typeof error === "object" && error !== null) {
      // Handle custom error objects
      if ("message" in error) {
        errorMessage = (error as any).message;
      }
      if (process.env.NODE_ENV === "development") {
        errorDetails = error;
      }
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      ...(process.env.NODE_ENV === "development" && { error: errorDetails }),
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
      return;
    }

    const { email, password, sessionId } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    console.error("Login error:", errors.array());
    if (!user) {
      console.log(`Login failed: User not found for email ${email}`);
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      console.log(`Login failed: Invalid password for email ${email}`);
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw createError("JWT secret not configured", 500);
    }

    const payload = { userId: String(user._id) };
    const token = generateToken(
      payload,
      jwtSecret,
      process.env.JWT_EXPIRES_IN || "7d"
    );

    // Merge guest cart if sessionId is provided
    let cartMerged = false;

    if (sessionId) {
      try {
        const { Cart } = await import("../models/Cart.model");

        // Get guest cart
        const guestCart = await Cart.findOne({ sessionId });
        if (guestCart && guestCart.items.length > 0) {
          // Get or create user cart
          let userCart = await Cart.findOne({ userId: user._id });
          if (!userCart) {
            userCart = new Cart({ userId: user._id, items: [] });
          }

          // Merge items
          for (const guestItem of guestCart.items) {
            const existingItemIndex = userCart.items.findIndex(
              (item) =>
                item.productId.toString() === guestItem.productId.toString() &&
                item.variationIndex === guestItem.variationIndex
            );

            if (existingItemIndex >= 0) {
              // Update quantity
              userCart.items[existingItemIndex].quantity += guestItem.quantity;
            } else {
              // Add new item
              userCart.items.push(guestItem);
            }
          }

          await userCart.save();
          // Delete guest cart
          await Cart.deleteOne({ sessionId });
          cartMerged = true;
        }
      } catch (error) {
        // Log error but don't fail login
        console.error("Error merging cart during login:", error);
      }
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
        token,
        cartMerged,
      },
    });
    return;
  } catch (error) {
    console.error("Login error:", error);

    // Handle different types of errors
    let errorMessage = "Login failed";
    let errorDetails = null;

    if (error instanceof Error) {
      errorMessage = error.message;
      if (process.env.NODE_ENV === "development") {
        errorDetails = {
          message: error.message,
          stack: error.stack,
          name: error.name,
        };
      }
    } else if (typeof error === "object" && error !== null) {
      // Handle custom error objects
      if ("message" in error) {
        errorMessage = (error as any).message;
      }
      if (process.env.NODE_ENV === "development") {
        errorDetails = error;
      }
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      ...(process.env.NODE_ENV === "development" && { error: errorDetails }),
    });
    return;
  }
};

export const changePassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    // Find user
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
      return;
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.passwordHash = newPasswordHash;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);

    // Handle different types of errors
    let errorMessage = "Failed to change password";
    let errorDetails = null;

    if (error instanceof Error) {
      errorMessage = error.message;
      if (process.env.NODE_ENV === "development") {
        errorDetails = {
          message: error.message,
          stack: error.stack,
          name: error.name,
        };
      }
    } else if (typeof error === "object" && error !== null) {
      // Handle custom error objects
      if ("message" in error) {
        errorMessage = (error as any).message;
      }
      if (process.env.NODE_ENV === "development") {
        errorDetails = error;
      }
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      ...(process.env.NODE_ENV === "development" && { error: errorDetails }),
    });
  }
};
