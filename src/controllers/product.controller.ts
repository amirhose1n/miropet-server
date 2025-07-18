import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth.middleware";
import { Product } from "../models/Product.model";

export const getAllProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
    } = req.query;

    // Build filter object
    const filter: any = {};

    if (category) {
      filter.category = {
        $in: Array.isArray(category) ? category : [category],
      };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort object
    const sortOptions: any = {};
    const validSortFields = ["createdAt", "name", "updatedAt"];
    const sortField = validSortFields.includes(sortBy as string)
      ? sortBy
      : "createdAt";
    const order = sortOrder === "asc" ? 1 : -1;
    sortOptions[sortField as string] = order;

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Execute queries
    const [products, totalCount] = await Promise.all([
      Product.find(filter).sort(sortOptions).skip(skip).limit(limitNum).lean(),
      Product.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      message: "محصولات با موفقیت دریافت شد",
      data: {
        products,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "دریافت محصولات ناموفق بود",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

export const getProductById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      res.status(404).json({
        success: false,
        message: "محصول یافت نشد",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "محصول با موفقیت دریافت شد",
      data: { product },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "دریافت محصول ناموفق بود",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

export const createProduct = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: "اعتبارسنجی ناموفق بود",
        errors: errors.array(),
      });
      return;
    }

    const {
      name,
      description,
      category,
      brand,
      variations,
      isFeatured = false,
    } = req.body;

    // Validate that variations exist and each has required fields
    if (!variations || !Array.isArray(variations) || variations.length === 0) {
      res.status(400).json({
        success: false,
        message: "حداقل یک تنوع محصول الزامی است",
      });
      return;
    }

    // Validate each variation
    for (const variation of variations) {
      if (!variation.price || variation.price <= 0) {
        res.status(400).json({
          success: false,
          message: "قیمت در هر تنوع الزامی و باید بیشتر از صفر باشد",
        });
        return;
      }

      // Validate discount if provided
      if (variation.discount !== undefined) {
        if (typeof variation.discount !== "number" || variation.discount < 0) {
          res.status(400).json({
            success: false,
            message: "تخفیف باید یک عدد غیرمنفی باشد",
          });
          return;
        }
        if (variation.discount >= variation.price) {
          res.status(400).json({
            success: false,
            message: "مقدار تخفیف باید کمتر از قیمت اصلی باشد",
          });
          return;
        }
      }

      if (
        typeof variation.stock !== "number" ||
        variation.stock < 0 ||
        !Number.isInteger(variation.stock)
      ) {
        res.status(400).json({
          success: false,
          message: "موجودی در هر تنوع باید یک عدد صحیح غیرمنفی باشد",
        });
        return;
      }
      if (
        !variation.images ||
        !Array.isArray(variation.images) ||
        variation.images.length === 0
      ) {
        res.status(400).json({
          success: false,
          message: "حداقل یک تصویر در هر تنوع الزامی است",
        });
        return;
      }
    }

    const product = new Product({
      name,
      description,
      category: Array.isArray(category) ? category : [category],
      brand,
      variations,
      isFeatured,
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: "محصول با موفقیت ایجاد شد",
      data: { product },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "ایجاد محصول ناموفق بود",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

export const updateProduct = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.createdAt;

    // If variations are being updated, validate them
    if (updates.variations) {
      if (
        !Array.isArray(updates.variations) ||
        updates.variations.length === 0
      ) {
        res.status(400).json({
          success: false,
          message: "حداقل یک تنوع محصول الزامی است",
        });
        return;
      }

      // Validate each variation
      for (const variation of updates.variations) {
        if (!variation.price || variation.price <= 0) {
          res.status(400).json({
            success: false,
            message: "قیمت در هر تنوع الزامی و باید بیشتر از صفر باشد",
          });
          return;
        }

        // Validate discount if provided
        if (variation.discount !== undefined) {
          if (
            typeof variation.discount !== "number" ||
            variation.discount < 0
          ) {
            res.status(400).json({
              success: false,
              message: "تخفیف باید یک عدد غیرمنفی باشد",
            });
            return;
          }
          if (variation.discount >= variation.price) {
            res.status(400).json({
              success: false,
              message: "مقدار تخفیف باید کمتر از قیمت اصلی باشد",
            });
            return;
          }
        }

        if (
          typeof variation.stock !== "number" ||
          variation.stock < 0 ||
          !Number.isInteger(variation.stock)
        ) {
          res.status(400).json({
            success: false,
            message: "موجودی در هر تنوع باید یک عدد صحیح غیرمنفی باشد",
          });
          return;
        }
        if (
          !variation.images ||
          !Array.isArray(variation.images) ||
          variation.images.length === 0
        ) {
          res.status(400).json({
            success: false,
            message: "حداقل یک تصویر در هر تنوع الزامی است",
          });
          return;
        }
      }
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!product) {
      res.status(404).json({
        success: false,
        message: "محصول یافت نشد",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "محصول با موفقیت به‌روزرسانی شد",
      data: { product },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "به‌روزرسانی محصول ناموفق بود",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

export const deleteProduct = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      res.status(404).json({
        success: false,
        message: "محصول یافت نشد",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "محصول با موفقیت حذف شد",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حذف محصول ناموفق بود",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};
