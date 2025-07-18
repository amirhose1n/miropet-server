import mongoose, { Document, Schema } from "mongoose";

export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  variationIndex: number; // Index of the variation in the product's variations array
  quantity: number;
  price: number; // Store price at time of adding to cart
  addedAt: Date;
}

export interface ICart extends Document {
  userId?: mongoose.Types.ObjectId; // Optional for guest carts
  sessionId?: string; // For guest carts
  items: ICartItem[];
  totalItems: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date; // For guest cart cleanup
  calculateTotals(): void;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variationIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const cartSchema = new Schema<ICart>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  sessionId: {
    type: String,
  },
  items: [cartItemSchema],
  totalItems: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalPrice: {
    type: Number,
    default: 0,
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
  },
});

// Indexes for performance
cartSchema.index({ userId: 1 }, { sparse: true });
cartSchema.index({ sessionId: 1 }, { sparse: true });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired guest carts

// Ensure either userId or sessionId exists, but not both
cartSchema.pre("save", function (next) {
  if (this.userId && this.sessionId) {
    const error = new Error("Cart cannot have both userId and sessionId");
    return next(error);
  }

  if (!this.userId && !this.sessionId) {
    const error = new Error("Cart must have either userId or sessionId");
    return next(error);
  }

  // Set expiration for guest carts
  if (!this.userId && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  this.updatedAt = new Date();
  next();
});

// Method to calculate totals
cartSchema.methods.calculateTotals = function () {
  this.totalItems = this.items.reduce(
    (sum: number, item: ICartItem) => sum + item.quantity,
    0
  );
  this.totalPrice = this.items.reduce(
    (sum: number, item: ICartItem) => sum + item.price * item.quantity,
    0
  );
};

// Pre-save hook to calculate totals
cartSchema.pre("save", function (next) {
  this.calculateTotals();
  next();
});

export const Cart = mongoose.model<ICart>("Cart", cartSchema);
