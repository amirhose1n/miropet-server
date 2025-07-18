import { Response } from "express";
import { validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth.middleware";
import { Address } from "../models/Address.model";

// Get user's addresses
export const getUserAddresses = async (
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

    const addresses = await Address.find({ userId: req.user._id }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      message: "Addresses retrieved successfully",
      data: { addresses },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve addresses",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Get address by ID
export const getAddressById = async (
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

    const { id } = req.params;
    const address = await Address.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!address) {
      res.status(404).json({
        success: false,
        message: "Address not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Address retrieved successfully",
      data: { address },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve address",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Create new address
export const createAddress = async (
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

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const { fullName, phone, address, city, postalCode, isDefault } = req.body;

    // If this is set as default and user has no addresses, make it default
    let shouldBeDefault = isDefault;
    if (!shouldBeDefault) {
      const existingAddressCount = await Address.countDocuments({
        userId: req.user._id,
      });
      if (existingAddressCount === 0) {
        shouldBeDefault = true;
      }
    }

    const newAddress = new Address({
      userId: req.user._id,
      fullName,
      phone,
      address,
      city,
      postalCode,
      isDefault: shouldBeDefault,
    });

    await newAddress.save();

    res.status(201).json({
      success: true,
      message: "Address created successfully",
      data: { address: newAddress },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create address",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Update address
export const updateAddress = async (
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

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const { id } = req.params;
    const { fullName, phone, address, city, postalCode, isDefault } = req.body;

    const existingAddress = await Address.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!existingAddress) {
      res.status(404).json({
        success: false,
        message: "Address not found",
      });
      return;
    }

    // Update fields
    existingAddress.fullName = fullName;
    existingAddress.phone = phone;
    existingAddress.address = address;
    existingAddress.city = city;
    existingAddress.postalCode = postalCode;
    existingAddress.isDefault = isDefault;

    await existingAddress.save();

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: { address: existingAddress },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update address",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Delete address
export const deleteAddress = async (
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

    const { id } = req.params;

    const address = await Address.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!address) {
      res.status(404).json({
        success: false,
        message: "Address not found",
      });
      return;
    }

    // If deleting default address, make another address default
    if (address.isDefault) {
      const otherAddress = await Address.findOne({
        userId: req.user._id,
        _id: { $ne: id },
      });

      if (otherAddress) {
        otherAddress.isDefault = true;
        await otherAddress.save();
      }
    }

    await Address.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete address",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Set default address
export const setDefaultAddress = async (
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

    const { id } = req.params;

    const address = await Address.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!address) {
      res.status(404).json({
        success: false,
        message: "Address not found",
      });
      return;
    }

    address.isDefault = true;
    await address.save();

    res.status(200).json({
      success: true,
      message: "Default address updated successfully",
      data: { address },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update default address",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};
