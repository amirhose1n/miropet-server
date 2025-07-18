import mongoose, { Document, Schema } from "mongoose";

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  productName: string; // Store at time of order for historical data
  productBrand?: string;
  variationIndex: number;
  variationDetails: {
    color?: string;
    size?: string;
    weight?: string;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  orderNumber: string; // Unique order number for customer reference
  items: IOrderItem[];

  // Pricing
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  totalAmount: number;

  // Delivery
  deliveryMethodId?: mongoose.Types.ObjectId;
  deliveryMethodName?: string; // Store for historical data
  deliveryMethodPrice?: number; // Store for historical data

  // Addresses - reference by ID
  shippingAddressId: mongoose.Types.ObjectId;
  billingAddressId?: mongoose.Types.ObjectId;

  // Order Status
  status: "submitted" | "inProgress" | "posted" | "done" | "canceled";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paymentMethod?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;

  // Notes
  customerNotes?: string;
  adminNotes?: string;

  // Tracking
  trackingNumber?: string;

  updateStatus(newStatus: string): void;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    productBrand: String,
    variationIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    variationDetails: {
      color: String,
      size: String,
      weight: String,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true,
  },
  items: [orderItemSchema],

  // Pricing
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: 0,
  },
  tax: {
    type: Number,
    default: 0,
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },

  // Delivery
  deliveryMethodId: {
    type: Schema.Types.ObjectId,
    ref: "DeliveryMethod",
  },
  deliveryMethodName: String,
  deliveryMethodPrice: {
    type: Number,
    min: 0,
  },

  // Addresses - reference by ID
  shippingAddressId: {
    type: Schema.Types.ObjectId,
    ref: "ShippingAddress",
    required: true,
  },
  billingAddressId: {
    type: Schema.Types.ObjectId,
    ref: "ShippingAddress",
  },

  // Status
  status: {
    type: String,
    enum: ["submitted", "inProgress", "posted", "done", "canceled"],
    default: "submitted",
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending",
  },
  paymentMethod: String,

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  confirmedAt: Date,
  shippedAt: Date,
  deliveredAt: Date,

  // Notes
  customerNotes: String,
  adminNotes: String,

  // Tracking
  trackingNumber: String,
});

// Indexes for performance
orderSchema.index({ userId: 1 });
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

// Generate unique order number
orderSchema.pre("save", async function (next) {
  if (this.isNew && !this.orderNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    this.orderNumber = `MP${timestamp.slice(-8)}${random}`;
  }

  this.updatedAt = new Date();
  next();
});

// Method to update order status with timestamp
orderSchema.methods.updateStatus = function (newStatus: string) {
  this.status = newStatus;

  switch (newStatus) {
    case "inProgress":
      this.confirmedAt = new Date();
      break;
    case "posted":
      this.shippedAt = new Date();
      break;
    case "done":
      this.deliveredAt = new Date();
      break;
  }

  this.updatedAt = new Date();
};

export const Order = mongoose.model<IOrder>("Order", orderSchema);
