import { body, ValidationChain } from "express-validator";

export const validateRegister: ValidationChain[] = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

export const validateLogin: ValidationChain[] = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password is required"),
  body("sessionId")
    .optional()
    .isString()
    .withMessage("Session ID must be a string"),
];

export const validateChangePassword: ValidationChain[] = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters")
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error("New password must be different from current password");
      }
      return true;
    }),
];

export const validateProduct: ValidationChain[] = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage("Name must be between 2 and 200 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description must not exceed 2000 characters"),
  body("category")
    .isArray({ min: 1 })
    .withMessage("At least one category is required"),
  body("brand")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Brand must not exceed 100 characters"),
  body("sku")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("SKU is required and must be between 1 and 200 characters"),
  body("variations")
    .isArray({ min: 1 })
    .withMessage("At least one variation is required"),
  body("variations.*.price")
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("variations.*.stock")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
  body("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be boolean"),
];

export const validateUserCreate: ValidationChain[] = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("role")
    .isIn(["customer", "admin"])
    .withMessage("Role must be either customer or admin"),
];

export const validateUserUpdate: ValidationChain[] = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email required"),
  body("role")
    .optional()
    .isIn(["customer", "admin"])
    .withMessage("Role must be either customer or admin"),
];

export const validateAdminCreation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("لطفاً یک ایمیل معتبر وارد کنید"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("رمز عبور باید حداقل ۸ کاراکتر باشد")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "رمز عبور باید شامل حداقل یک حرف بزرگ، یک حرف کوچک، یک عدد و یک کاراکتر خاص باشد"
    ),
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("نام باید بین ۲ تا ۵۰ کاراکتر باشد")
    .notEmpty()
    .withMessage("نام برای کاربران مدیر الزامی است"),
];

// OTP validation rules
export const validateSendOTP: ValidationChain[] = [
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("شماره موبایل الزامی است")
    .custom((value) => {
      // Remove any non-digit characters
      const cleanPhone = value.replace(/\D/g, "");

      // Check if it's a valid Iranian mobile number
      const iranianMobileRegex = /^09\d{9}$/;
      const iranianMobileWithCountryCodeRegex = /^(\+98|98)9\d{9}$/;

      if (
        !iranianMobileRegex.test(cleanPhone) &&
        !iranianMobileWithCountryCodeRegex.test(cleanPhone)
      ) {
        throw new Error(
          "شماره موبایل باید در فرمت صحیح ایرانی باشد (مثال: 09123456789)"
        );
      }

      return true;
    }),
];

export const validateVerifyOTP: ValidationChain[] = [
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("شماره موبایل الزامی است")
    .custom((value) => {
      const cleanPhone = value.replace(/\D/g, "");
      const iranianMobileRegex = /^09\d{9}$/;
      const iranianMobileWithCountryCodeRegex = /^(\+98|98)9\d{9}$/;

      if (
        !iranianMobileRegex.test(cleanPhone) &&
        !iranianMobileWithCountryCodeRegex.test(cleanPhone)
      ) {
        throw new Error("شماره موبایل باید در فرمت صحیح ایرانی باشد");
      }

      return true;
    }),
  body("otp")
    .trim()
    .isLength({ min: 5, max: 5 })
    .withMessage("کد تایید باید ۵ رقم باشد")
    .isNumeric()
    .withMessage("کد تایید باید فقط شامل اعداد باشد"),
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("نام باید بین ۲ تا ۵۰ کاراکتر باشد"),
  body("sessionId")
    .optional()
    .isString()
    .withMessage("Session ID باید رشته باشد"),
];

export const validateUpdateProfile: ValidationChain[] = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("نام باید بین ۲ تا ۵۰ کاراکتر باشد"),
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("ایمیل باید معتبر باشد"),
];

export const validateRefreshToken: ValidationChain[] = [
  body("refreshToken").notEmpty().withMessage("Refresh token is required"),
];

export const validateLogout: ValidationChain[] = [
  body("refreshToken")
    .optional()
    .isString()
    .withMessage("Refresh token must be a string"),
];
