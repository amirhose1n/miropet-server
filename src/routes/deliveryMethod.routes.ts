import express from "express";
import { body } from "express-validator";
import {
  createDeliveryMethod,
  deleteDeliveryMethod,
  getAllDeliveryMethodsAdmin,
  getDeliveryMethodById,
  getDeliveryMethods,
  toggleDeliveryMethodStatus,
  updateDeliveryMethod,
} from "../controllers/deliveryMethod.controller";
import { adminAuth } from "../middleware/auth.middleware";

const router = express.Router();

// Validation middleware
const validateDeliveryMethod = [
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 100 })
    .withMessage("Name must be less than 100 characters"),
  body("subtitle")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Subtitle must be less than 200 characters"),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("validationDesc")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Validation description must be less than 500 characters"),
  body("isEnabled")
    .optional()
    .isBoolean()
    .withMessage("isEnabled must be a boolean"),
];

// Public routes (for customers)
router.get("/", getDeliveryMethods);
router.get("/:id", getDeliveryMethodById);

// Admin routes
router.get("/admin/all", adminAuth, getAllDeliveryMethodsAdmin);
router.post("/admin", adminAuth, validateDeliveryMethod, createDeliveryMethod);
router.put(
  "/admin/:id",
  adminAuth,
  validateDeliveryMethod,
  updateDeliveryMethod
);
router.delete("/admin/:id", adminAuth, deleteDeliveryMethod);
router.patch("/admin/:id/toggle", adminAuth, toggleDeliveryMethodStatus);

export default router;
