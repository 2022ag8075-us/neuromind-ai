import { Request, Response, NextFunction } from "express";

/* =========================================================
   🔐 EXTENDED REQUEST TYPE (TRACE SUPPORT)
========================================================= */
interface RequestWithId extends Request {
  id?: string;
}

/* =========================================================
   🧠 NORMALIZED ERROR SHAPE
========================================================= */
interface NormalizedError {
  statusCode: number;
  message: string;
  stack?: string | null;
  name?: string;
}

/* =========================================================
   🧠 ERROR NORMALIZER (SMART)
========================================================= */
const normalizeError = (err: any): NormalizedError => {
  let statusCode = err?.statusCode || err?.status || 500;
  let message =
    err?.message ||
    err?.error ||
    "Internal Server Error";

  /* =========================
     🔐 JWT ERRORS
  ========================= */
  if (err?.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  if (err?.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  /* =========================
     🗄️ MONGOOSE ERRORS
  ========================= */
  if (err?.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource ID";
  }

  if (err?.code === 11000) {
    statusCode = 400;
    message = "Duplicate field value";
  }

  if (err?.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val: any) => val.message)
      .join(", ");
  }

  return {
    statusCode,
    message,
    stack: err?.stack || null,
    name: err?.name || "Error",
  };
};

/* =========================================================
   🚨 GLOBAL ERROR MIDDLEWARE (PRODUCTION HARDENED)
========================================================= */
export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const requestId =
    (req as RequestWithId)?.id ||
    `req_${Date.now()}`;

  const error = normalizeError(err);

  /* ==============================
     🚫 PREVENT DOUBLE RESPONSE
  ============================== */
  if (res.headersSent) {
    return;
  }

  /* ==============================
     🧾 STRUCTURED LOGGING
  ============================== */
  const logPayload = {
    level: "error",
    requestId,
    method: req.method,
    path: req.originalUrl,
    status: error.statusCode,
    message: error.message,
    name: error.name,
    timestamp: new Date().toISOString(),
  };

  console.error("====================================");
  console.error("🔥 GLOBAL ERROR");
  console.error(JSON.stringify(logPayload, null, 2));

  if (process.env.NODE_ENV !== "production") {
    console.error("📌 Stack Trace:");
    console.error(error.stack);
  }
  console.error("====================================");

  /* ==============================
     📦 SAFE RESPONSE
  ============================== */
  return res.status(error.statusCode).json({
    success: false,
    error: {
      message: error.message,
      code: error.statusCode,
      requestId,
    },
  });
};

/* =========================================================
   ⚡ ASYNC WRAPPER (IMPORTANT)
   Use this to wrap controllers
========================================================= */
export const asyncHandler =
  (fn: any) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);