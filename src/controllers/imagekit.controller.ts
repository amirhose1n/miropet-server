import crypto from "crypto";
import { Request, Response } from "express";

//@ts-check
export const getImageKitAuth = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || "";

    if (!privateKey) {
      res.status(500).json({
        success: false,
        message: "ImageKit private key not configured",
      });
      return;
    }

    const token = Date.now().toString();
    const expire = Math.floor(Date.now() / 1000) + 1800; // 30 minutes from now in Unix seconds (less than 1 hour)

    // Create signature using HMAC-SHA1
    const stringToSign = token + expire;
    const signature = crypto
      .createHmac("sha1", privateKey)
      .update(stringToSign)
      .digest("hex");

    res.json({
      success: true,
      token,
      expire,
      signature,
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to generate authentication parameters",
      error: error.message,
    });
    return;
  }
};
