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
  getChatSessions,
  getChatBySession,
  deleteChatSession,
  clearChatHistory,
} from "../controllers/chatController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================================================
   🧠 REQUEST EXTENSION (SAFE)
========================================================= */
interface RequestWithMeta extends Request {
  id?: string;
}

/* =========================================================
   ⚡ SAFE ASYNC WRAPPER (ELIMINATES TRY/CATCH CHAOS)
========================================================= */
const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/* =========================================================
   🧠 SAFE RESPONSE HELPERS
========================================================= */
const sendSuccess = (res: Response, data: any, status = 200) => {
  return res.status(status).json({
    success: true,
    data,
  });
};

const sendError = (
  res: Response,
  message: string,
  status = 500
) => {
  return res.status(status).json({
    success: false,
    message,
  });
};

/* =========================================================
   🧠 REQUEST ID (TRACEABILITY)
========================================================= */
router.use((req: RequestWithMeta, _res, next) => {
  req.id = crypto.randomUUID();
  next();
});

/* =========================================================
   🚦 RATE LIMITERS (PRODUCTION SAFE)
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
   🛡️ MESSAGE VALIDATION (HARDENED)
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
   📊 REQUEST LOGGER
========================================================= */
router.use((req: RequestWithMeta, _res, next) => {
  console.log(`[CHAT ${req.id}] ${req.method} ${req.originalUrl}`);
  next();
});

/* =========================================================
   💬 NORMAL CHAT
========================================================= */
router.post(
  "/",
  protect,
  baseLimiter,
  validateMessage,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await chatWithAI(req as any, res);

    // IMPORTANT: ensure controller doesn't send response twice
    if (!res.headersSent) {
      return sendSuccess(res, result);
    }
  })
);

/* =========================================================
   🔴 STREAM CHAT (STABLE SSE)
========================================================= */
router.post(
  "/stream",
  protect,
  streamLimiter,
  validateMessage,
  asyncHandler(async (req: RequestWithMeta, res: Response) => {
    if (res.headersSent) return;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    // heartbeat to prevent proxy timeout
    const heartbeat = setInterval(() => {
      if (!res.writableEnded) {
        res.write(": ping\n\n");
      }
    }, 15000);

    req.on("close", () => {
      clearInterval(heartbeat);
      res.end();
      console.log(`[STREAM CLOSED ${req.id}]`);
    });

    await streamChatWithAI(req as any, res);
  })
);

/* =========================================================
   📂 SESSION ROUTES
========================================================= */
router.get(
  "/sessions",
  protect,
  asyncHandler(async (req, res) => {
    const data = await getChatSessions(req as any, res);
    return sendSuccess(res, data);
  })
);

router.get(
  "/messages/:sessionId",
  protect,
  asyncHandler(async (req, res) => {
    const data = await getChatBySession(req as any, res);
    return sendSuccess(res, data);
  })
);

router.delete(
  "/session/:sessionId",
  protect,
  asyncHandler(async (req, res) => {
    await deleteChatSession(req as any, res);
    return sendSuccess(res, { deleted: true });
  })
);

router.delete(
  "/all",
  protect,
  asyncHandler(async (req, res) => {
    await clearChatHistory(req as any, res);
    return sendSuccess(res, { cleared: true });
  })
);

/* =========================================================
   ❤️ HEALTH CHECK
========================================================= */
router.get("/health", (_req, res) => {
  return res.json({
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
   🚨 GLOBAL ERROR HANDLER (CRASH SAFE)
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