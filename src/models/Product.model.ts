import mongoose, { Document, Schema } from "mongoose";

export interface IVariation {
  color?: string;
  size?: string;
  price: number;
  discount?: number; // Discount amount (must be less than price)
  weight?: string;
  stock: number;
  images: string[];
}

export interface IProduct extends Document {
  name: string;
  description?: string;
  category: string[];
  brand?: string;
  variations: IVariation[];
  isFeatured: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

const variationSchema = new Schema<IVariation>(
  {
    color: { type: String },
    size: { type: String },
    price: { type: Number, required: true, min: 0 },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: function (this: IVariation, value: number) {
          return value < this.price;
        },
        message: "Discount must be less than price",
      },
    },
    weight: { type: String },
    stock: { type: Number, required: true, default: 0, min: 0 },
    images: [{ type: String, required: true }],
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  description: String,
  category: [{ type: String, required: true }], // e.g., food, toys, grooming
  brand: String,
  variations: [{ type: variationSchema, required: true }],
  isFeatured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

// Update the updatedAt field before saving
productSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const Product = mongoose.model<IProduct>("Product", productSchema);
