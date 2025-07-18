import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth.middleware";
import { DeliveryMethod } from "../models/DeliveryMethod.model";

// Get all delivery methods (for customers - only enabled ones)
export const getDeliveryMethods = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const deliveryMethods = await DeliveryMethod.find({ isEnabled: true })
      .select("name subtitle price validationDesc")
      .sort({ price: 1 }); // Sort by price ascending

    res.status(200).json({
      success: true,
      message: "Delivery methods retrieved successfully",
      data: {
        deliveryMethods,
        total: deliveryMethods.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve delivery methods",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Get all delivery methods for admin (includes disabled ones)
export const getAllDeliveryMethodsAdmin = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const isEnabled = req.query.isEnabled as string;

    // Build filter
    const filter: any = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { subtitle: { $regex: search, $options: "i" } },
      ];
    }
    if (isEnabled !== undefined) {
      filter.isEnabled = isEnabled === "true";
    }

    const skip = (page - 1) * limit;

    const [deliveryMethods, total] = await Promise.all([
      DeliveryMethod.find(filter)
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      DeliveryMethod.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: "Delivery methods retrieved successfully",
      data: {
        deliveryMethods,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve delivery methods",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Get single delivery method by ID
export const getDeliveryMethodById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const deliveryMethod = await DeliveryMethod.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!deliveryMethod) {
      res.status(404).json({
        success: false,
        message: "Delivery method not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Delivery method retrieved successfully",
      data: { deliveryMethod },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve delivery method",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Create new delivery method (Admin only)
export const createDeliveryMethod = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
      return;
    }

    const {
      name,
      subtitle,
      price,
      validationDesc,
      isEnabled = true,
    } = req.body;

    // Check if delivery method with same name already exists
    const existingMethod = await DeliveryMethod.findOne({ name });
    if (existingMethod) {
      res.status(400).json({
        success: false,
        message: "Delivery method with this name already exists",
      });
      return;
    }

    const deliveryMethod = new DeliveryMethod({
      name,
      subtitle,
      price,
      validationDesc,
      isEnabled,
      createdBy: req.user!._id as any,
      updatedBy: req.user!._id as any,
    });

    await deliveryMethod.save();

    res.status(201).json({
      success: true,
      message: "Delivery method created successfully",
      data: { deliveryMethod },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create delivery method",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Update delivery method (Admin only)
export const updateDeliveryMethod = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
      return;
    }

    const { id } = req.params;
    const { name, subtitle, price, validationDesc, isEnabled } = req.body;

    const deliveryMethod = await DeliveryMethod.findById(id);
    if (!deliveryMethod) {
      res.status(404).json({
        success: false,
        message: "Delivery method not found",
      });
      return;
    }

    // Check if name is being changed and if new name already exists
    if (name && name !== deliveryMethod.name) {
      const existingMethod = await DeliveryMethod.findOne({ name });
      if (existingMethod) {
        res.status(400).json({
          success: false,
          message: "Delivery method with this name already exists",
        });
        return;
      }
    }

    // Update fields
    if (name !== undefined) deliveryMethod.name = name;
    if (subtitle !== undefined) deliveryMethod.subtitle = subtitle;
    if (price !== undefined) deliveryMethod.price = price;
    if (validationDesc !== undefined)
      deliveryMethod.validationDesc = validationDesc;
    if (isEnabled !== undefined) deliveryMethod.isEnabled = isEnabled;
    deliveryMethod.updatedBy = req.user!._id as any;

    await deliveryMethod.save();

    res.status(200).json({
      success: true,
      message: "Delivery method updated successfully",
      data: { deliveryMethod },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update delivery method",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Delete delivery method (Admin only)
export const deleteDeliveryMethod = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const deliveryMethod = await DeliveryMethod.findById(id);
    if (!deliveryMethod) {
      res.status(404).json({
        success: false,
        message: "Delivery method not found",
      });
      return;
    }

    await DeliveryMethod.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Delivery method deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete delivery method",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Toggle delivery method status (Admin only)
export const toggleDeliveryMethodStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const deliveryMethod = await DeliveryMethod.findById(id);
    if (!deliveryMethod) {
      res.status(404).json({
        success: false,
        message: "Delivery method not found",
      });
      return;
    }

    deliveryMethod.isEnabled = !deliveryMethod.isEnabled;
    deliveryMethod.updatedBy = req.user!._id as any;
    await deliveryMethod.save();

    res.status(200).json({
      success: true,
      message: `Delivery method ${
        deliveryMethod.isEnabled ? "enabled" : "disabled"
      } successfully`,
      data: { deliveryMethod },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to toggle delivery method status",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};
