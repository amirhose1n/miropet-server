import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProduct,
} from "../controllers/product.controller";
import { authenticateToken, requireAdmin } from "../middleware/auth.middleware";
import { validateProduct } from "../middleware/validation.middleware";

const router = Router();

// GET /api/products - Get all products (public)
router.get("/", getAllProducts);

// GET /api/products/:id - Get product by ID (public)
router.get("/:id", getProductById);

// POST /api/products - Create product (admin only)
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  validateProduct,
  createProduct
);

// PUT /api/products/:id - Update product (admin only)
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  validateProduct,
  updateProduct
);

// DELETE /api/products/:id - Delete product (admin only)
router.delete("/:id", authenticateToken, requireAdmin, deleteProduct);

export default router;
