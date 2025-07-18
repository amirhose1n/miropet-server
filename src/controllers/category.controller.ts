import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { Category } from "../models/Category.model";

export const createCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name } = req.body;

    const category = new Category({ name });
    await category.save();

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: {
        category,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Create failed",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

export const getCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
      return;
    }

    const categories = await Category.find();

    res.status(201).json({
      success: true,
      message: "Customer registered successfully",
      data: {
        categories,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Fetch failed",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};
