import mongoose, { Document, Schema } from "mongoose";

export interface IDeliveryMethod extends Document {
  name: string;
  subtitle?: string;
  price: number;
  validationDesc?: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId; // Admin who created
  updatedBy: mongoose.Types.ObjectId; // Admin who last updated
}

const deliveryMethodSchema = new Schema<IDeliveryMethod>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  validationDesc: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  isEnabled: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

// Indexes for performance
deliveryMethodSchema.index({ isEnabled: 1 });
deliveryMethodSchema.index({ name: 1 });

// Pre-save hook to update timestamp
deliveryMethodSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const DeliveryMethod = mongoose.model<IDeliveryMethod>(
  "DeliveryMethod",
  deliveryMethodSchema
);
