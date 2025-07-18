import express from "express";
import { getImageKitAuth } from "../controllers/imagekit.controller";

const router = express.Router();

// GET /api/imagekit-auth - Get authentication parameters for ImageKit upload
router.get("/auth", getImageKitAuth);

export default router;
