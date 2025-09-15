import { Router } from "express";
import {
  logout,
  refreshToken,
  sendOTP,
  updateProfile,
  verifyOTP,
} from "../controllers/auth.controller";
import { auth } from "../middleware/auth.middleware";
import {
  validateLogout,
  validateRefreshToken,
  validateSendOTP,
  validateUpdateProfile,
  validateVerifyOTP,
} from "../middleware/validation.middleware";

const router = Router();

// OTP-based authentication flow
// POST /api/auth/send-otp
router.post("/send-otp", validateSendOTP, sendOTP);

// POST /api/auth/verify-otp
router.post("/verify-otp", validateVerifyOTP, verifyOTP);

// Token management
// POST /api/auth/refresh-token
router.post("/refresh-token", validateRefreshToken, refreshToken);

// POST /api/auth/logout
router.post("/logout", auth, validateLogout, logout);

// User profile management
// POST /api/auth/update-profile
router.post("/update-profile", auth, validateUpdateProfile, updateProfile);

export default router;
