import { Router } from "express";
import { body } from "express-validator";
import {
  createAddress,
  deleteAddress,
  getAddressById,
  getUserAddresses,
  setDefaultAddress,
  updateAddress,
} from "../controllers/address.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

// All address routes require authentication
router.use(authenticateToken);

// Address validation rules
const addressValidation = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters"),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^09\d{9}$/)
    .withMessage("Phone number must be in format 09XXXXXXXXX"),

  body("address")
    .trim()
    .notEmpty()
    .withMessage("Address is required")
    .isLength({ min: 5, max: 500 })
    .withMessage("Address must be between 5 and 500 characters"),

  body("city")
    .trim()
    .notEmpty()
    .withMessage("City is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("City must be between 2 and 100 characters"),

  body("postalCode")
    .optional()
    .trim()
    .matches(/^\d{10}$/)
    .withMessage("Postal code must be 10 digits"),

  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be a boolean value"),
];

// Routes
router.get("/", getUserAddresses);
router.get("/:id", getAddressById);
router.post("/", addressValidation, createAddress);
router.put("/:id", addressValidation, updateAddress);
router.put("/:id/default", setDefaultAddress);
router.delete("/:id", deleteAddress);

export default router;
