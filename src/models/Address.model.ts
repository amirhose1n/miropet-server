import mongoose, { Document, Schema } from "mongoose";

export interface IAddress extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  fullName: string;
  phone: string;
  address: string; // Full address (replaces street)
  city: string;
  postalCode?: string; // Optional as per requirement
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
addressSchema.index({ userId: 1 });
addressSchema.index({ userId: 1, isDefault: 1 });

// Ensure only one default address per user
addressSchema.pre("save", async function (next) {
  if (this.isDefault) {
    // Remove default flag from other addresses of the same user
    await mongoose
      .model("Address")
      .updateMany(
        { userId: this.userId, _id: { $ne: this._id } },
        { isDefault: false }
      );
  }
  next();
});

export const Address = mongoose.model<IAddress>("Address", addressSchema);
