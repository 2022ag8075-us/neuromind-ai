import express, {
  Request,
  Response,
  NextFunction,
} from "express";

import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";
import fs from "fs/promises";
import path from "path";

const router = express.Router();

/**
 * ==============================
 * 🧠 SAFE REQUEST TYPE
 * ==============================
 */
interface ImageRequest extends Request {
  file?: Express.Multer.File;
}

/**
 * ==============================
 * 🧼 IMAGE VALIDATION MIDDLEWARE
 * ==============================
 */
const validateImageFile = (
  req: ImageRequest,
  res: Response,
  next: NextFunction
) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      success: false,
      message: "Image file is required",
    });
  }

  /**
   * 🖼 MIME TYPE SECURITY CHECK
   */
  const allowedMime = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
  ];

  if (!allowedMime.includes(file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: "Invalid image format",
    });
  }

  /**
   * 📦 SIZE LIMIT (10MB MAX)
   */
  const MAX_SIZE = 10 * 1024 * 1024;

  if (file.size > MAX_SIZE) {
    return res.status(400).json({
      success: false,
      message: "Image too large (max 10MB)",
    });
  }

  next();
};

/**
 * ==============================
 * 🧠 SAFE LOGGER
 * ==============================
 */
router.use((req, _res, next) => {
  console.log(`[IMAGE] ${req.method} ${req.originalUrl}`);
  next();
});

/**
 * ==============================
 * 🖼 VISION CONTROLLER (CORE)
 * ==============================
 * This is READY for:
 * - Groq Vision (future update)
 * - OpenAI Vision API
 * - custom AI pipeline
 */
const processImageWithAI = async (filePath: string) => {
  /**
   * 🔥 TEMP MOCK (REPLACE WITH VISION MODEL)
   *
   * Example later:
   * - Groq Vision API
   * - OpenAI GPT-4o Vision
   */
  return {
    description: "This image appears to contain visual content.",
    objects: ["unknown"],
    sentiment: "neutral",
  };
};

/**
 * ==============================
 * 🖼 IMAGE UPLOAD → AI ANALYSIS
 * ==============================
 */
router.post(
  "/",
  protect,
  upload.single("image"),
  validateImageFile,
  async (req: ImageRequest, res: Response, next: NextFunction) => {
    const file = req.file;

    if (!file?.path) {
      return res.status(400).json({
        success: false,
        message: "File upload failed",
      });
    }

    try {
      /**
       * ==============================
       * 🧠 STEP 1: READ IMAGE
       * ==============================
       */
      const filePath = file.path;

      /**
       * OPTIONAL: Base64 conversion (for vision APIs)
       */
      const base64Image = await fs.readFile(filePath, {
        encoding: "base64",
      });

      /**
       * ==============================
       * 🧠 STEP 2: AI VISION PROCESSING
       * ==============================
       */
      const aiResult = await processImageWithAI(filePath);

      /**
       * ==============================
       * 🧹 STEP 3: CLEANUP FILE SAFELY
       * ==============================
       */
      try {
        await fs.unlink(filePath);
      } catch (cleanupErr) {
        console.warn("[IMAGE CLEANUP FAILED]", cleanupErr);
      }

      /**
       * ==============================
       * 📦 RESPONSE
       * ==============================
       */
      return res.json({
        success: true,
        message: "Image processed successfully",
        data: {
          ...aiResult,
          base64: base64Image.slice(0, 200) + "...", // safe preview only
        },
      });
    } catch (err) {
      console.error("[IMAGE ERROR]", err);

      /**
       * 🧹 SAFE CLEANUP ON ERROR
       */
      try {
        if (file?.path) {
          await fs.unlink(file.path);
        }
      } catch {}

      return res.status(500).json({
        success: false,
        message: "Image processing failed",
      });
    }
  }
);

/**
 * ==============================
 * ❌ 404 HANDLER
 * ==============================
 */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Image route not found: ${req.method} ${req.originalUrl}`,
  });
});

/**
 * ==============================
 * 🚨 GLOBAL ERROR HANDLER
 * ==============================
 */
router.use(
  (err: any, req: ImageRequest, res: Response, _next: NextFunction) => {
    console.error("[IMAGE ROUTE ERROR]", err);

    if (res.headersSent) return;

    res.status(500).json({
      success: false,
      message: "Image processing failed",
    });
  }
);

export default router;