import { User } from "../models/User.model";

export const initializeAdminUser = async (): Promise<void> => {
  try {
    const adminPhone = "09198957843";
    const adminName = "MiroPet Admin";

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ phone: adminPhone });

    if (existingAdmin) {
      console.log("✅ Admin user already exists:", adminPhone);
      return;
    }

    // Create the admin user
    const adminUser = new User({
      name: adminName,
      phone: adminPhone,
      role: "admin",
      isPhoneVerified: true,
    });

    await adminUser.save();
    console.log("🚀 Initial admin user created successfully!");
    console.log("📱 Phone:", adminPhone);
    console.log("👤 Name:", adminName);
    console.log("🔑 Role: admin");
    console.log("✅ Phone verified: true");
  } catch (error) {
    console.error("❌ Error creating initial admin user:", error);
  }
};
