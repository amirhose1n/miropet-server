import express from "express";
import {
  cancelOrder,
  checkout,
  getOrderById,
  getOrders,
  getOrderStats,
  getUserOrders,
  updateOrderStatus,
} from "../controllers/order.controller";
import { adminAuth, auth } from "../middleware/auth.middleware";

const router = express.Router();

// Public/Customer routes
router.post("/checkout", auth, checkout); // Checkout and create order with payment
router.get("/my-orders", auth, getUserOrders); // Get current user's orders
router.get("/:id", getOrderById); // Get order by ID (can be used by customer or admin)
router.patch("/:id/cancel", cancelOrder); // Cancel order (before posted status)

// Admin routes
router.get("/", adminAuth, getOrders); // Get all orders with filters (admin only)
router.patch("/:id/status", adminAuth, updateOrderStatus); // Update order status (admin only)
router.get("/stats/summary", adminAuth, getOrderStats); // Get order statistics (admin only)

export default router;
