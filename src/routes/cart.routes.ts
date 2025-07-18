import { Router } from "express";
import {
  addToCart,
  clearCart,
  getCart,
  mergeCart,
  removeFromCart,
  updateCartItem,
} from "../controllers/cart.controller";
import { auth, optionalAuth } from "../middleware/auth.middleware";

const router = Router();

/**
 * @route   GET /api/cart
 * @desc    Get current cart (supports both guest and authenticated users)
 * @access  Public/Private
 */
router.get("/", optionalAuth, getCart);

/**
 * @route   POST /api/cart/add
 * @desc    Add item to cart
 * @access  Public/Private
 * @body    { productId, variationIndex, quantity }
 */
router.post("/add", optionalAuth, addToCart);

/**
 * @route   PUT /api/cart/update
 * @desc    Update cart item quantity
 * @access  Public/Private
 * @body    { productId, variationIndex, quantity }
 */
router.put("/update", optionalAuth, updateCartItem);

/**
 * @route   DELETE /api/cart/remove
 * @desc    Remove item from cart
 * @access  Public/Private
 * @body    { productId, variationIndex }
 */
router.delete("/remove", optionalAuth, removeFromCart);

/**
 * @route   DELETE /api/cart/clear
 * @desc    Clear entire cart
 * @access  Public/Private
 */
router.delete("/clear", optionalAuth, clearCart);

/**
 * @route   POST /api/cart/merge
 * @desc    Merge guest cart with user cart after login
 * @access  Private
 * @body    { sessionId }
 */
router.post("/merge", auth, mergeCart);

export default router;
