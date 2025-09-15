import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth.middleware";
import { createError } from "../middleware/error.middleware";
import { OTPSession } from "../models/OTPSession.model";
import { User } from "../models/User.model";
import { smsService } from "../services/sms.service";
import { generateTokenPair } from "../utils/jwt.utils";

// Send OTP to phone number
export const sendOTP = async (req: Request, res: Response): Promise<void> => {
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

    const { phone } = req.body;

    // Check if there's already an active OTP session for this phone
    const existingSession = await OTPSession.findOne({
      phone,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (existingSession) {
      // Check if user has exceeded attempt limit
      if (existingSession.attempts >= 3) {
        res.status(429).json({
          success: false,
          message:
            "تعداد تلاش‌های مجاز برای این شماره تمام شده است. لطفاً کمی صبر کنید.",
        });
        return;
      }

      // Check if less than 1 minute has passed since last OTP
      const timeDiff = Date.now() - existingSession.createdAt.getTime();
      if (timeDiff < 60000) {
        // 1 minute
        const remainingTime = Math.ceil((60000 - timeDiff) / 1000);
        res.status(429).json({
          success: false,
          message: `لطفاً ${remainingTime} ثانیه دیگر تلاش کنید.`,
        });
        return;
      }
    }

    // Send OTP using SMS service
    const smsResult = await smsService.sendOTP(phone);

    if (!smsResult.success) {
      res.status(400).json({
        success: false,
        message: smsResult.message,
      });
      return;
    }

    // Store OTP session in database
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    // Delete any existing sessions for this phone
    await OTPSession.deleteMany({ phone, isUsed: false });

    const otpSession = new OTPSession({
      phone,
      otp: smsResult.otp!,
      expiresAt,
      attempts: 0,
      isUsed: false,
    });

    await otpSession.save();

    res.status(200).json({
      success: true,
      message: smsResult.message,
      data: {
        phone,
        expiresIn: 300, // 5 minutes in seconds
      },
    });
  } catch (error) {
    console.error("Send OTP error:", error);

    let errorMessage = "خطا در ارسال کد تایید";
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

export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
      return;
    }

    const { phone, otp, name, sessionId } = req.body;

    const otpSession = await OTPSession.findOne({
      phone,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpSession) {
      res.status(400).json({
        success: false,
        message:
          "کد تایید منقضی شده یا وجود ندارد. لطفاً مجدداً درخواست کد دهید.",
      });
      return;
    }

    // Check attempt limit
    if (otpSession.attempts >= 3) {
      res.status(429).json({
        success: false,
        message:
          "تعداد تلاش‌های مجاز تمام شده است. لطفاً مجدداً درخواست کد دهید.",
      });
      return;
    }

    // Verify OTP
    if (otpSession.otp !== otp) {
      // Increment attempts
      otpSession.attempts += 1;
      await otpSession.save();

      res.status(400).json({
        success: false,
        message: "کد تایید اشتباه است",
        remainingAttempts: 3 - otpSession.attempts,
      });
      return;
    }

    // OTP is correct, mark as used
    otpSession.isUsed = true;
    await otpSession.save();

    // Find or create user
    let user = await User.findOne({ phone });

    if (!user) {
      // Create new user
      user = new User({
        phone,
        name: name || null,
        role: "customer",
        isPhoneVerified: true,
      });
      await user.save();
    } else {
      // Update existing user
      user.isPhoneVerified = true;
      if (name && !user.name) {
        user.name = name;
      }
      await user.save();
    }

    // Generate JWT token pair
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw createError("JWT secret not configured", 500);
    }

    const payload = { userId: String(user._id) };
    const { accessToken, refreshToken } = generateTokenPair(payload, jwtSecret);

    // Store refresh token in user document
    user.refreshTokens.push(refreshToken);
    await user.save();

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
      message: "ورود با موفقیت انجام شد",
      data: {
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          isPhoneVerified: user.isPhoneVerified,
          createdAt: user.createdAt,
        },
        accessToken,
        refreshToken,
        cartMerged,
        isNewUser: !user.name, // Indicates if this is a new user who needs to complete profile
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);

    let errorMessage = "خطا در تایید کد";
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

// Refresh access token
export const refreshToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: "Refresh token is required",
      });
      return;
    }

    // Find user with this refresh token
    const user = await User.findOne({ refreshTokens: refreshToken });
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
      return;
    }

    // Generate new token pair
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw createError("JWT secret not configured", 500);
    }

    const payload = { userId: String(user._id) };
    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(
      payload,
      jwtSecret
    );

    // Remove old refresh token and add new one
    user.refreshTokens = user.refreshTokens.filter(
      (token) => token !== refreshToken
    );
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    let errorMessage = "خطا در تازه‌سازی توکن";
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

// Logout user (invalidate refresh token)
export const logout = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    if (refreshToken) {
      // Remove specific refresh token
      req.user.refreshTokens = req.user.refreshTokens.filter(
        (token) => token !== refreshToken
      );
      await req.user.save();
    } else {
      // Remove all refresh tokens (logout from all devices)
      req.user.refreshTokens = [];
      await req.user.save();
    }

    res.status(200).json({
      success: true,
      message: "خروج با موفقیت انجام شد",
    });
  } catch (error) {
    console.error("Logout error:", error);

    let errorMessage = "خطا در خروج";
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

// Update user profile
export const updateProfile = async (
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

    const { name, email } = req.body;

    // Find user
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: user._id },
      });
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: "این ایمیل قبلاً استفاده شده است",
        });
        return;
      }
    }

    // Update user fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;

    await user.save();

    res.status(200).json({
      success: true,
      message: "پروفایل با موفقیت به‌روزرسانی شد",
      data: {
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          isPhoneVerified: user.isPhoneVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);

    let errorMessage = "خطا در به‌روزرسانی پروفایل";
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
