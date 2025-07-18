import bcrypt from "bcryptjs";
import { Response } from "express";
import { validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth.middleware";
import { createError } from "../middleware/error.middleware";
import { User } from "../models/User.model";
import { generateToken } from "../utils/jwt.utils";

export const getUserProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          createdAt: req.user.createdAt,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve profile",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

export const createAdminUser = async (
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

    // Verify that the requesting user is an admin
    if (!req.user || req.user.role !== "admin") {
      res.status(403).json({
        success: false,
        message: "Only admins can create other admin users",
      });
      return;
    }

    const { name, email, password } = req.body;

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

    // Create admin user
    const adminUser = new User({
      name,
      email,
      passwordHash,
      role: "admin",
    });

    await adminUser.save();

    // Generate JWT token for the new admin
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw createError("JWT secret not configured", 500);
    }

    const payload = { userId: String(adminUser._id) };
    const token = generateToken(
      payload,
      jwtSecret,
      process.env.JWT_EXPIRES_IN || "7d"
    );

    res.status(201).json({
      success: true,
      message: "Admin user created successfully",
      data: {
        user: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          createdAt: adminUser.createdAt,
        },
        token,
        createdBy: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create admin user",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

export const getAllUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Verify that the requesting user is an admin
    if (!req.user || req.user.role !== "admin") {
      res.status(403).json({
        success: false,
        message: "Only admins can access users list",
      });
      return;
    }

    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const role = req.query.role as string;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      res.status(400).json({
        success: false,
        message:
          "Invalid pagination parameters. Page must be >= 1, limit must be between 1-100",
      });
      return;
    }

    // Build search query
    const searchQuery: any = {};

    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (role && (role === "admin" || role === "customer")) {
      searchQuery.role = role;
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const totalUsers = await User.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalUsers / limit);

    // Fetch users with pagination
    const users = await User.find(searchQuery)
      .select("-passwordHash") // Exclude password hash from response
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit);

    // Format user data
    const formattedUsers = users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    }));

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: {
        users: formattedUsers,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        filters: {
          search,
          role: role || "all",
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve users",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};
