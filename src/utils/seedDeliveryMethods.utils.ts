import { DeliveryMethod } from "../models/DeliveryMethod.model";
import { User } from "../models/User.model";

export const seedDeliveryMethods = async (): Promise<void> => {
  try {
    // Check if delivery methods already exist
    const existingMethods = await DeliveryMethod.countDocuments();
    if (existingMethods > 0) {
      console.log("✅ Delivery methods already exist");
      return;
    }

    // Find admin user to assign as creator
    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      console.log("❌ No admin user found for seeding delivery methods");
      return;
    }

    const defaultDeliveryMethods = [
      {
        name: "ارسال عادی",
        subtitle: "ارسال با پست پیشتاز (۳-۵ روز کاری)",
        price: 50000,
        validationDesc: "برای سفارش‌های زیر ۵۰۰،۰۰۰ تومان",
        isEnabled: true,
        createdBy: adminUser._id,
        updatedBy: adminUser._id,
      },
      {
        name: "ارسال رایگان",
        subtitle: "ارسال رایگان برای سفارش‌های بالای ۵۰۰،۰۰۰ تومان",
        price: 0,
        validationDesc: "فقط برای سفارش‌های بالای ۵۰۰،۰۰۰ تومان",
        isEnabled: true,
        createdBy: adminUser._id,
        updatedBy: adminUser._id,
      },
      {
        name: "ارسال فوری",
        subtitle: "ارسال در همان روز (تهران و کرج)",
        price: 150000,
        validationDesc: "فقط برای شهرهای تهران و کرج - سفارش تا ساعت ۱۴",
        isEnabled: true,
        createdBy: adminUser._id,
        updatedBy: adminUser._id,
      },
      {
        name: "پیک موتوری",
        subtitle: "ارسال با پیک موتوری (۲-۴ ساعت)",
        price: 80000,
        validationDesc: "فقط در محدوده شهر تهران",
        isEnabled: true,
        createdBy: adminUser._id,
        updatedBy: adminUser._id,
      },
      {
        name: "باربری",
        subtitle: "ارسال با باربری (برای سفارش‌های سنگین)",
        price: 200000,
        validationDesc: "برای سفارش‌های بالای ۱۰ کیلوگرم",
        isEnabled: false, // Disabled by default
        createdBy: adminUser._id,
        updatedBy: adminUser._id,
      },
    ];

    await DeliveryMethod.insertMany(defaultDeliveryMethods);
    console.log("✅ Default delivery methods seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding delivery methods:", error);
  }
};
