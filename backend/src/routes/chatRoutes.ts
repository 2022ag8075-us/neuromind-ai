import express, {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";

import rateLimit from "express-rate-limit";
import crypto from "crypto";

import {
  chatWithAI,
  streamChatWithAI,
  createChatSession,
  getChatSessions,
  getChatBySession,
  deleteChatSession,
  clearChatHistory,
} from "../controllers/chatController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================================================
   🧠 REQUEST TYPE EXTENSION
========================================================= */
interface RequestWithMeta extends Request {
  id?: string;
  startTime?: number;
}

/* =========================================================
   ⚡ SAFE ASYNC WRAPPER
========================================================= */
const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/* =========================================================
   🧠 ERROR RESPONSE
========================================================= */
const sendError = (res: Response, message: string, status = 500) => {
  if (res.headersSent) return;
  return res.status(status).json({
    success: false,
    message,
  });
};

/* =========================================================
   🧠 REQUEST ID + TIMING
========================================================= */
router.use((req: RequestWithMeta, _res, next) => {
  req.id = crypto.randomUUID();
  req.startTime = Date.now();
  next();
});

/* =========================================================
   📊 REQUEST LOGGER
========================================================= */
router.use((req: RequestWithMeta, _res, next) => {
  console.log(
    `[CHAT ${req.id}] ${req.method} ${req.originalUrl}`
  );
  next();
});

/* =========================================================
   🚦 RATE LIMITERS
========================================================= */
const baseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const streamLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
});

/* =========================================================
   🛡️ MESSAGE VALIDATION
========================================================= */
const validateMessage: RequestHandler = (req, res, next) => {
  const msg = req.body?.message;

  if (typeof msg !== "string") {
    return sendError(res, "Invalid message format", 400);
  }

  const clean = msg.trim();

  if (!clean) {
    return sendError(res, "Message cannot be empty", 400);
  }

  if (clean.length > 2000) {
    return sendError(res, "Message too long", 400);
  }

  req.body.message = clean;
  next();
};

/* =========================================================
   💬 NORMAL CHAT (STABLE)
========================================================= */
router.post(
  "/",
  protect,
  baseLimiter,
  validateMessage,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await chatWithAI(req as any, res);

    if (!res.headersSent) {
      return res.json({
        success: true,
        data: result,
      });
    }
  })
);

/* =========================================================
   🔴 STREAM CHAT (FULL SSE ENGINE)
========================================================= */
router.post(
  "/stream",
  protect,
  streamLimiter,
  validateMessage,
  asyncHandler(async (req: RequestWithMeta, res: Response) => {
    if (res.headersSent) return;

    // =========================
    // SSE HEADERS
    // =========================
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    // =========================
    // HEARTBEAT (PREVENT TIMEOUT)
    // =========================
    const heartbeat = setInterval(() => {
      if (!res.writableEnded) {
        res.write(": keep-alive\n\n");
      }
    }, 12000);

    // =========================
    // CLEAN ABORT HANDLING
    // =========================
    const cleanup = () => {
      clearInterval(heartbeat);

      try {
        if (!res.writableEnded) {
          res.end();
        }
      } catch {}

      console.log(`[STREAM CLOSED ${req.id}]`);
    };

    req.on("close", cleanup);
    req.on("aborted", cleanup);

    try {
      await streamChatWithAI(req as any, res);
    } catch (err) {
      console.error(`[STREAM ERROR ${req.id}]`, err);

      if (!res.writableEnded) {
        res.write(
          `event: error\ndata: ${JSON.stringify({
            message: "Stream failed",
          })}\n\n`
        );
      }

      cleanup();
    }
  })
);

/* =========================================================
   📂 SESSION ROUTES
========================================================= */

router.post(
  "/sessions",
  protect,
  asyncHandler(createChatSession)
);
router.get(
  "/sessions",
  protect,
  asyncHandler(getChatSessions)
);

router.get(
  "/messages/:sessionId",
  protect,
  asyncHandler(getChatBySession)
);

router.delete(
  "/session/:sessionId",
  protect,
  asyncHandler(deleteChatSession)
);

router.delete(
  "/all",
  protect,
  asyncHandler(clearChatHistory)
);

/* =========================================================
   ❤️ HEALTH CHECK
========================================================= */
router.get("/health", (_req, res) => {
  res.json({
    success: true,
    service: "NeuroMind Chat API",
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/* =========================================================
   ❌ 404 HANDLER
========================================================= */
router.use((req, res) => {
  return sendError(
    res,
    `Route not found: ${req.method} ${req.originalUrl}`,
    404
  );
});

/* =========================================================
   🚨 GLOBAL ERROR HANDLER
========================================================= */
router.use(
  (err: any, req: RequestWithMeta, res: Response, _next: NextFunction) => {
    console.error(`[CHAT ERROR ${req.id}]`, err);

    if (res.headersSent) return;

    return sendError(
      res,
      err?.message || "Internal server error",
      500
    );
  }
);

export default router;