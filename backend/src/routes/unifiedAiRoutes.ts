import express, { Request, Response, NextFunction, RequestHandler } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";

import { unifiedChat } from "../controllers/unifiedAiController.js";
import { unifiedStream } from "../controllers/unifiedStreamController.js";
import { protect } from "../middleware/authMiddleware.js";
import { nextTick } from "node:process";

const router = express.Router();

/* =========================================================
   📦 MULTER (PRODUCTION SAFE)
========================================================= */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 3,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "audio/mpeg",
      "audio/wav",
      "audio/webm",
      "audio/mp4",
    ];

    cb(null, allowed.includes(file.mimetype));
  },
});

/* =========================================================
   🚦 RATE LIMITERS
========================================================= */
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const streamLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
});

/* =========================================================
   🛡️ INPUT VALIDATION (FIXED TYPE SAFETY)
========================================================= */
const validateInput: RequestHandler = (req, res, next) => {
  const message = req.body?.message;

  if (message && typeof message !== "string") {
    res.status(400).json({
      success: false,
      message: "Message must be a string",
    });
    return;
  }

  if (message && message.length > 4000) {
    res.status(400).json({
      success: false,
      message: "Message too long",
    });
    return;
  }

  next();
};

/* =========================================================
   📊 LOGGER
========================================================= */
router.use((req, _res, next) => {
  console.log(`[AI] ${req.method} ${req.originalUrl}`);
  next();
});

/* =========================================================
   🧠 CHAT ROUTE (FIXED CALL SIGNATURE)
========================================================= */
router.post(
  "/unified-chat",
  protect,
  aiLimiter,
  upload.any(),
  validateInput,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // ❌ FIX: do NOT pass next unless controller expects it
      await unifiedChat(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

/* =========================================================
   🔴 STREAM ROUTE (FIXED SSE TYPES)
========================================================= */
router.post(
  "/unified-chat/stream",
  protect,
  streamLimiter,
  express.json(),
  validateInput,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (res.headersSent) return;

      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });

      const keepAlive = setInterval(() => {
        if (!res.writableEnded) {
          res.write(":\n\n");
        }
      }, 15000);

      req.on("close", () => {
        clearInterval(keepAlive);
        res.end();
      });

      // ❌ FIX: controller should NOT receive next
      await unifiedStream(req, res);
    } catch (err) {
      next(err);
    }
  }
);

/* =========================================================
   ❤️ HEALTH
========================================================= */
router.get("/health", (_req, res) => {
  res.json({
    success: true,
    service: "Unified AI",
    status: "ok",
    time: new Date().toISOString(),
  });
});

/* =========================================================
   ❌ 404
========================================================= */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `AI route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* =========================================================
   🚨 ERROR HANDLER (FINAL FIX)
========================================================= */
router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[AI ROUTE ERROR]", err);

  if (res.headersSent) return;

  res.status(500).json({
    success: false,
    message: err instanceof Error ? err.message : "AI route failed",
  });
});

export default router;