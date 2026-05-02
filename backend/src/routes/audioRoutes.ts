import express, {
  Request,
  Response,
  NextFunction,
} from "express";

import { protect } from "../middleware/authMiddleware.js";
import { chatWithAudio } from "../controllers/audioController.js";
import { upload } from "../middleware/uploadMiddleware.js";
import fs from "fs/promises";

const router = express.Router();

/**
 * ==============================
 * 🎯 REQUEST TYPE (SAFE EXTENSION)
 * ==============================
 */
interface AudioRequest extends Request {
  file?: Express.Multer.File;
}

/**
 * ==============================
 * 🧠 MEMORY-SAFE FILE GUARD
 * ==============================
 */
const validateAudioFile = (
  req: AudioRequest,
  res: Response,
  next: NextFunction
) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      success: false,
      message: "Audio file is required",
    });
  }

  /**
   * 🎯 FILE TYPE VALIDATION
   */
  const allowedMime = [
    "audio/mpeg",
    "audio/wav",
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
  ];

  if (!allowedMime.includes(file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: "Unsupported audio format",
    });
  }

  /**
   * 🎯 FILE SIZE CHECK (SAFETY NET)
   */
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  if (file.size > MAX_SIZE) {
    return res.status(400).json({
      success: false,
      message: "Audio file too large (max 10MB)",
    });
  }

  next();
};

/**
 * ==============================
 * 🧠 SAFE LOGGER (OPTIONAL DEBUG)
 * ==============================
 */
router.use((req, _res, next) => {
  console.log(`[AUDIO] ${req.method} ${req.originalUrl}`);
  next();
});

/**
 * ==============================
 * 🎤 AUDIO → AI ROUTE
 * ==============================
 */
router.post(
  "/",
  protect,
  upload.single("audio"),
  validateAudioFile,
  async (req: AudioRequest, res: Response, next: NextFunction) => {
    try {
      await chatWithAudio(req, res);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * ==============================
 * 🧹 EMERGENCY CLEANUP SAFETY
 * ==============================
 * Prevents orphaned files in crash cases
 */
router.use(
  async (err: any, req: AudioRequest, res: Response, next: NextFunction) => {
    try {
      if (req.file?.path) {
        await fs.unlink(req.file.path);
      }
    } catch {
      // silent fail (important)
    }

    next(err);
  }
);

/**
 * ==============================
 * ❌ 404 HANDLER (ROUTE ISOLATION READY)
 * ==============================
 */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Audio route not found: ${req.method} ${req.originalUrl}`,
  });
});

/**
 * ==============================
 * 🚨 GLOBAL ERROR HANDLER
 * ==============================
 */
router.use((err: any, req: AudioRequest, res: Response, _next: NextFunction) => {
  console.error("[AUDIO ROUTE ERROR]", err);

  if (res.headersSent) return;

  res.status(500).json({
    success: false,
    message: "Audio processing failed",
  });
});

export default router;