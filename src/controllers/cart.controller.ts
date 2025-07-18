import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { AuthRequest } from "../middleware/auth.middleware";
import { Cart, ICart } from "../models/Cart.model";
import { Product } from "../models/Product.model";

// Helper function to get or create cart
const getOrCreateCart = async (req: Request): Promise<ICart | null> => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?._id;

  let sessionId = req.headers["cart-session-id"] as string;
  if (!sessionId && !userId) {
    sessionId = uuidv4();
  }

  let cart;

  if (userId) {
    // For authenticated users
    cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
      await cart.save();
    }
  } else {
    // For guest users
    cart = await Cart.findOne({ sessionId });
    if (!cart && sessionId) {
      cart = new Cart({ sessionId, items: [] });
      await cart.save();
    }
  }

  return cart;
};

// Get cart
export const getCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const cart = await getOrCreateCart(req);
    if (!cart) {
      res.status(404).json({
        success: false,
        message: "Cart not found",
      });
      return;
    }

    // Get all products for cart items
    const productIds = cart.items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    const formattedItems = cart.items
      .map((item) => {
        const product = products.find(
          (p) => (p._id as any).toString() === item.productId.toString()
        );
        if (!product || !product.variations[item.variationIndex]) {
          return null; // Will be filtered out
        }

        const variation = product.variations[item.variationIndex];

        // Calculate current price with discount
        const currentPrice =
          variation.discount && variation.discount > 0
            ? variation.price - variation.discount
            : variation.price;

        return {
          id: `${product._id}-${item.variationIndex}`,
          product: {
            _id: product._id,
            name: product.name,
            brand: product.brand,
            category: product.category,
          },
          variation: {
            ...variation,
            index: item.variationIndex,
          },
          quantity: item.quantity,
          unitPrice: currentPrice, // Use current discounted price
          totalPrice: currentPrice * item.quantity,
          addedAt: item.addedAt,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null); // Remove null items and fix type

    // Recalculate totals based on current prices
    const totalItems = formattedItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const totalPrice = formattedItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    res.status(200).json({
      success: true,
      message: "Cart retrieved successfully",
      data: {
        cart: {
          _id: cart._id,
          items: formattedItems,
          totalItems,
          totalPrice,
          createdAt: cart.createdAt,
          updatedAt: cart.updatedAt,
        },
        sessionId: cart.sessionId, // Return session ID for guest users
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve cart",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Add item to cart
export const addToCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, variationIndex, quantity = 1 } = req.body;

    if (!productId || variationIndex === undefined) {
      res.status(400).json({
        success: false,
        message: "Product ID and variation index are required",
      });
      return;
    }

    // Validate product and variation
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    if (!product.variations[variationIndex]) {
      res.status(400).json({
        success: false,
        message: "Invalid variation index",
      });
      return;
    }

    const variation = product.variations[variationIndex];

    // Check stock availability
    if (variation.stock < quantity) {
      res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${variation.stock}`,
      });
      return;
    }

    const cart = await getOrCreateCart(req);
    if (!cart) {
      res.status(500).json({
        success: false,
        message: "Failed to create cart",
      });
      return;
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.variationIndex === variationIndex
    );

    if (existingItemIndex >= 0) {
      // Update quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      if (newQuantity > variation.stock) {
        res.status(400).json({
          success: false,
          message: `Cannot add ${quantity} items. Maximum available: ${
            variation.stock - cart.items[existingItemIndex].quantity
          }`,
        });
        return;
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item
      const finalPrice =
        variation.discount && variation.discount > 0
          ? variation.price - variation.discount
          : variation.price;

      cart.items.push({
        productId,
        variationIndex,
        quantity,
        price: finalPrice,
        addedAt: new Date(),
      });
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Item added to cart successfully",
      data: {
        cart: {
          totalItems: cart.totalItems,
          totalPrice: cart.totalPrice,
        },
        sessionId: cart.sessionId,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add item to cart",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Update cart item quantity
export const updateCartItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId, variationIndex, quantity } = req.body;

    if (!productId || variationIndex === undefined || !quantity) {
      res.status(400).json({
        success: false,
        message: "Product ID, variation index, and quantity are required",
      });
      return;
    }

    if (quantity < 1) {
      res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
      return;
    }

    const cart = await getOrCreateCart(req);
    if (!cart) {
      res.status(404).json({
        success: false,
        message: "Cart not found",
      });
      return;
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.variationIndex === variationIndex
    );

    if (itemIndex === -1) {
      res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
      return;
    }

    // Validate stock
    const product = await Product.findById(productId);
    if (!product || !product.variations[variationIndex]) {
      res.status(404).json({
        success: false,
        message: "Product or variation not found",
      });
      return;
    }

    const variation = product.variations[variationIndex];
    if (quantity > variation.stock) {
      res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${variation.stock}`,
      });
      return;
    }

    // Update quantity and price with current discount
    const currentPrice =
      variation.discount && variation.discount > 0
        ? variation.price - variation.discount
        : variation.price;

    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].price = currentPrice; // Update to current discounted price
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart item updated successfully",
      data: {
        cart: {
          totalItems: cart.totalItems,
          totalPrice: cart.totalPrice,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update cart item",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Remove item from cart
export const removeFromCart = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId, variationIndex } = req.body;

    if (!productId || variationIndex === undefined) {
      res.status(400).json({
        success: false,
        message: "Product ID and variation index are required",
      });
      return;
    }

    const cart = await getOrCreateCart(req);
    if (!cart) {
      res.status(404).json({
        success: false,
        message: "Cart not found",
      });
      return;
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.variationIndex === variationIndex
    );

    if (itemIndex === -1) {
      res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
      return;
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Item removed from cart successfully",
      data: {
        cart: {
          totalItems: cart.totalItems,
          totalPrice: cart.totalPrice,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to remove item from cart",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Clear cart
export const clearCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const cart = await getOrCreateCart(req);
    if (!cart) {
      res.status(404).json({
        success: false,
        message: "Cart not found",
      });
      return;
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      data: {
        cart: {
          totalItems: 0,
          totalPrice: 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to clear cart",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Merge guest cart with user cart (when user logs in)
export const mergeCart = async (
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

    const { sessionId } = req.body;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
      return;
    }

    // Get guest cart
    const guestCart = await Cart.findOne({ sessionId });
    if (!guestCart || guestCart.items.length === 0) {
      res.status(200).json({
        success: true,
        message: "No guest cart items to merge",
      });
      return;
    }

    // Get or create user cart
    let userCart = await Cart.findOne({ userId: req.user._id });
    if (!userCart) {
      userCart = new Cart({ userId: req.user._id, items: [] });
    }

    // Merge items
    for (const guestItem of guestCart.items) {
      const existingItemIndex = userCart.items.findIndex(
        (item) =>
          item.productId.toString() === guestItem.productId.toString() &&
          item.variationIndex === guestItem.variationIndex
      );

      if (existingItemIndex >= 0) {
        // Update quantity
        userCart.items[existingItemIndex].quantity += guestItem.quantity;
      } else {
        // Add new item
        userCart.items.push(guestItem);
      }
    }

    await userCart.save();

    // Delete guest cart
    await Cart.deleteOne({ sessionId });

    res.status(200).json({
      success: true,
      message: "Cart merged successfully",
      data: {
        cart: {
          totalItems: userCart.totalItems,
          totalPrice: userCart.totalPrice,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to merge cart",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};
