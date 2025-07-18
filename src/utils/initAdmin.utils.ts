import bcrypt from "bcryptjs";
import { User } from "../models/User.model";

export const initializeAdminUser = async (): Promise<void> => {
  try {
    const adminEmail = "miropet@miro.com";
    const adminPassword = "miro@2024!petShop";
    const adminName = "MiroPet Admin";

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log("✅ Admin user already exists:", adminEmail);
      return;
    }

    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    // Create the admin user
    const adminUser = new User({
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: "admin",
    });

    await adminUser.save();
    console.log("🚀 Initial admin user created successfully:", adminEmail);
    console.log("📧 Email:", adminEmail);
    console.log("🔐 Password:", adminPassword);
    console.log("⚠️  Please change the password after first login!");
  } catch (error) {
    console.error("❌ Error creating initial admin user:", error);
  }
};
