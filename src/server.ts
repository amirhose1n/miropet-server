import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { connectDB } from "./config/database";
import { errorHandler } from "./middleware/error.middleware";
import addressRoutes from "./routes/address.routes";
import authRoutes from "./routes/auth.routes";
import cartRoutes from "./routes/cart.routes";
import categoryRoutes from "./routes/category.routes";
import deliveryMethodRoutes from "./routes/deliveryMethod.routes";
import imagekitRoutes from "./routes/imagekit.routes";
import orderRoutes from "./routes/order.routes";
import productRoutes from "./routes/product.routes";
import userRoutes from "./routes/user.routes";
import { initializeAdminUser } from "./utils/initAdmin.utils";
import { seedDeliveryMethods } from "./utils/seedDeliveryMethods.utils";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB and initialize admin user
const initializeApp = async () => {
  await connectDB();
  await initializeAdminUser();
  await seedDeliveryMethods();
};

initializeApp();

// Routes
app.use("/api/address", addressRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/delivery-methods", deliveryMethodRoutes);
app.use("/api/imagekit", imagekitRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/category", categoryRoutes);

// POST health endpoint for testing
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "POST request to health endpoint is working",
    timestamp: new Date().toISOString(),
    method: "POST",
    body: req.body,
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler with debugging
app.use("*", (req, res) => {
  console.log(
    `404 - Method: ${req.method}, URL: ${req.url}, Headers:`,
    req.headers
  );
  res.status(404).json({
    success: false,
    message: "Route not found",
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  });
});

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
});
