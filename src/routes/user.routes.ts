import { Router } from "express";
import {
  createAdminUser,
  getAllUsers,
  getUserProfile,
} from "../controllers/user.controller";
import {
  authenticateToken,
  requireAdmin,
  requireCustomerOrAdmin,
} from "../middleware/auth.middleware";
import { validateAdminCreation } from "../middleware/validation.middleware";

const router = Router();

// GET /api/users - Get all users with pagination (admin only)
router.get("/", authenticateToken, requireAdmin, getAllUsers);

// GET /api/users/profile - Get user profile (authenticated users)
router.get(
  "/profile",
  authenticateToken,
  requireCustomerOrAdmin,
  getUserProfile
);

// POST /api/users/admin - Create admin user (admin only)
router.post(
  "/admin",
  authenticateToken,
  requireAdmin,
  validateAdminCreation,
  createAdminUser
);

export default router;
