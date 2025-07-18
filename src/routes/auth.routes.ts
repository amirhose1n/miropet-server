import { Router } from "express";
import {
  changePassword,
  login,
  register,
} from "../controllers/auth.controller";
import { auth } from "../middleware/auth.middleware";
import {
  validateChangePassword,
  validateLogin,
  validateRegister,
} from "../middleware/validation.middleware";

const router = Router();

// POST /api/auth/register
router.post("/register", validateRegister, register);

// POST /api/auth/login
router.post("/login", validateLogin, login);

// POST /api/auth/change-password
router.post("/change-password", auth, validateChangePassword, changePassword);

export default router;
