import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { Cart } from "../models/Cart.model";
import { Order } from "../models/Order.model";
import { Product } from "../models/Product.model";

// Fake Payment Service - Replace with real bank integration later
class PaymentService {
  static async processPayment(
    orderData: any
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    // Simulate payment processing time
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate random success/failure (90% success rate)
    const success = Math.random() > 0.1;

    if (success) {
      return {
        success: true,
        transactionId: `TX${Date.now()}${Math.floor(Math.random() * 1000)}`,
      };
    } else {
      return {
        success: false,
        error: "Payment failed due to insufficient funds or network error",
      };
    }
  }
}

// Checkout and create order with payment processing
export const checkout = async (
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

    const {
      shippingAddressId,
      billingAddressId,
      paymentMethod,
      customerNotes,
      deliveryMethodId,
    } = req.body;

    if (!shippingAddressId) {
      res.status(400).json({
        success: false,
        message: "Shipping address ID is required",
      });
      return;
    }

    // Validate addresses belong to user
    const { Address } = await import("../models/Address.model");

    const shippingAddress = await Address.findOne({
      _id: shippingAddressId,
      userId: req.user._id,
    });

    if (!shippingAddress) {
      res.status(400).json({
        success: false,
        message: "Invalid shipping address",
      });
      return;
    }

    let billingAddress = null;
    if (billingAddressId) {
      billingAddress = await Address.findOne({
        _id: billingAddressId,
        userId: req.user._id,
      });

      if (!billingAddress) {
        res.status(400).json({
          success: false,
          message: "Invalid billing address",
        });
        return;
      }
    }

    // Validate delivery method if provided
    let deliveryMethod = null;
    let deliveryMethodPrice = 0;
    if (deliveryMethodId) {
      const { DeliveryMethod } = await import("../models/DeliveryMethod.model");
      deliveryMethod = await DeliveryMethod.findById(deliveryMethodId);

      if (!deliveryMethod) {
        res.status(400).json({
          success: false,
          message: "Invalid delivery method",
        });
        return;
      }

      if (!deliveryMethod.isEnabled) {
        res.status(400).json({
          success: false,
          message: "Selected delivery method is not available",
        });
        return;
      }

      deliveryMethodPrice = deliveryMethod.price;
    }

    // Get user's cart
    const cart = await Cart.findOne({ userId: req.user._id }).populate(
      "items.productId"
    );

    if (!cart || cart.items.length === 0) {
      res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
      return;
    }

    // Validate cart items and prepare order items
    const orderItems = [];
    let subtotal = 0;

    for (const cartItem of cart.items) {
      const product = cartItem.productId as any;

      if (!product) {
        res.status(400).json({
          success: false,
          message: "Invalid product in cart",
        });
        return;
      }

      const variation = product.variations[cartItem.variationIndex];

      if (!variation) {
        res.status(400).json({
          success: false,
          message: `Invalid variation for product ${product.name}`,
        });
        return;
      }

      // Check stock availability
      if (variation.stock < cartItem.quantity) {
        res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${variation.stock}`,
        });
        return;
      }

      // Calculate current price with discount
      const currentUnitPrice =
        variation.discount && variation.discount > 0
          ? variation.price - variation.discount
          : variation.price;

      const totalPrice = currentUnitPrice * cartItem.quantity;
      subtotal += totalPrice;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        productBrand: product.brand,
        variationIndex: cartItem.variationIndex,
        variationDetails: {
          color: variation.color,
          size: variation.size,
          weight: variation.weight,
        },
        quantity: cartItem.quantity,
        unitPrice: currentUnitPrice, // Use current discounted price
        totalPrice,
      });
    }

    // Calculate order totals
    const shippingCost =
      deliveryMethodPrice > 0
        ? deliveryMethodPrice
        : subtotal > 500000
        ? 0
        : 50000;
    const tax = 0;
    // Math.floor(subtotal * 0.09);
    const discount = 0; // Add discount logic if needed
    const totalAmount = subtotal + shippingCost + tax - discount;

    // Create the order first (status: submitted)
    const order = new Order({
      userId: req.user._id,
      items: orderItems,
      subtotal,
      shippingCost,
      tax,
      discount,
      totalAmount,
      deliveryMethodId: deliveryMethod?._id,
      deliveryMethodName: deliveryMethod?.name,
      deliveryMethodPrice: deliveryMethodPrice,
      shippingAddressId: shippingAddress._id,
      billingAddressId: billingAddress?._id,
      paymentMethod,
      customerNotes,
      status: "submitted",
      paymentStatus: "pending",
      orderNumber: `ORD-${Date.now()}${Math.floor(Math.random() * 1000)}`,
    });

    await order.save();

    // Process payment
    const paymentResult = await PaymentService.processPayment({
      orderId: order._id,
      amount: totalAmount,
      paymentMethod,
      customerInfo: {
        userId: req.user._id,
        email: req.user.email,
      },
    });

    if (paymentResult.success) {
      // Payment successful - update order status
      order.paymentStatus = "paid";
      order.status = "inProgress";
      await order.save();

      // Update product stock
      for (const cartItem of cart.items) {
        const product = await Product.findById(cartItem.productId);
        if (product && product.variations[cartItem.variationIndex]) {
          product.variations[cartItem.variationIndex].stock -=
            cartItem.quantity;
          await product.save();
        }
      }

      // Clear the cart
      cart.items = [];
      await cart.save();

      res.status(201).json({
        success: true,
        message: "سفارش با موفقیت ثبت شد",
        data: {
          order: {
            _id: order._id,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            status: order.status,
            paymentStatus: order.paymentStatus,
            createdAt: order.createdAt,
          },
          payment: {
            transactionId: paymentResult.transactionId,
            status: "completed",
          },
        },
      });
    } else {
      // Payment failed - update order status
      order.paymentStatus = "failed";
      await order.save();

      res.status(400).json({
        success: false,
        message: "Payment failed",
        data: {
          order: {
            _id: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
          },
          payment: {
            error: paymentResult.error,
          },
        },
      });
    }
  } catch (error: any) {
    console.error("Checkout error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process checkout",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get orders with filters
export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      userId,
      startDate,
      endDate,
      orderNumber,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (userId) {
      filter.userId = userId;
    }

    if (orderNumber) {
      filter.orderNumber = { $regex: orderNumber, $options: "i" };
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate as string);
      }
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "desc" ? -1 : 1;

    const orders = await Order.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate("userId", "name email")
      .populate("items.productId", "name brand category");

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limitNum);

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalOrders,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error: any) {
    console.error("Get orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get user's orders
export const getUserOrders = async (
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

    const { page = 1, limit = 10, status, paymentStatus } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter: any = { userId: req.user._id };

    if (status) {
      filter.status = status;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("items.productId", "name brand category");

    const totalOrders = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalOrders / limitNum),
          totalOrders,
        },
      },
    });
  } catch (error: any) {
    console.error("Get user orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user orders",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get order by ID
export const getOrderById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate("userId", "name email phone")
      .populate("items.productId", "name brand category images");

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { order },
    });
  } catch (error: any) {
    console.error("Get order by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Cancel order (only allowed before 'posted' status)
export const cancelOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    // Check if order can be canceled
    if (order.status === "posted" || order.status === "done") {
      res.status(400).json({
        success: false,
        message: "Order cannot be canceled after it has been posted",
      });
      return;
    }

    if (order.status === "canceled") {
      res.status(400).json({
        success: false,
        message: "Order is already canceled",
      });
      return;
    }

    // Update order status
    order.status = "canceled";
    order.adminNotes = `Canceled: ${reason || "No reason provided"}`;

    // Handle refund if payment was successful
    if (order.paymentStatus === "paid") {
      order.paymentStatus = "refunded";
      // Here you would integrate with payment gateway to process refund
    }

    await order.save();

    // Restore product stock
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (product && product.variations[item.variationIndex]) {
        product.variations[item.variationIndex].stock += item.quantity;
        await product.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Order canceled successfully",
      data: { order },
    });
  } catch (error: any) {
    console.error("Cancel order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel order",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Update order status (Admin only)
export const updateOrderStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, adminNotes, trackingNumber } = req.body;

    const validStatuses = [
      "submitted",
      "inProgress",
      "posted",
      "done",
      "canceled",
    ];

    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid status",
      });
      return;
    }

    const order = await Order.findById(id);

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    // Update order
    order.updateStatus(status);

    if (adminNotes) {
      order.adminNotes = adminNotes;
    }

    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: { order },
    });
  } catch (error: any) {
    console.error("Update order status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get order statistics
export const getOrderStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    const paymentStats = await Order.aggregate([
      {
        $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        orderStats: stats,
        paymentStats,
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
    });
  } catch (error: any) {
    console.error("Get order stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
