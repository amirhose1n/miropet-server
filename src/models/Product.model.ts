import mongoose, { Document, Schema } from "mongoose";
import { generateUniqueSKU } from "../utils/sku.utils";

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
  sku: string;
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
  sku: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

// Generate SKU before saving
productSchema.pre("save", async function (next) {
  try {
    // Only generate SKU if it's not already set or if name/brand changed
    if (!this.sku || this.isModified("name") || this.isModified("brand")) {
      // Get all existing SKUs except current document
      const existingProducts = await (this.constructor as any).find({}, "sku");
      const existingSKUs = existingProducts
        .map((p: any) => p.sku)
        .filter((sku: string) => sku && sku !== this.sku);

      // Generate unique SKU
      this.sku = await generateUniqueSKU(
        this.name,
        this.brand,
        existingSKUs,
        this.sku
      );
    }

    this.updatedAt = new Date();
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const Product = mongoose.model<IProduct>("Product", productSchema);
