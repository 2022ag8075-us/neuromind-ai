import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../models/userModel.js";

/* =========================================================
   🔐 SAFE REQUEST TYPE
========================================================= */
export interface AuthRequest extends Request {
  user?: {
    _id: string;
    email?: string;
    role?: string;
  };
  token?: string;
}

/* =========================================================
   🚨 SAFE RESPONSE HELPER
========================================================= */
const fail = (
  res: Response,
  message: string,
  code = 401,
  meta?: Record<string, any>
) => {
  if (res.headersSent) return;
  return res.status(code).json({
    success: false,
    message,
    ...(meta && { meta }),
  });
};

/* =========================================================
   🔐 TOKEN PAYLOAD TYPE
========================================================= */
interface DecodedToken extends JwtPayload {
  id: string;
  iat?: number;
  exp?: number;
}

/* =========================================================
   🔐 TYPE GUARD (SAFE ERROR CHECK)
========================================================= */
const isJwtError = (err: unknown): err is { name: string; message: string } => {
  return typeof err === "object" && err !== null && "name" in err;
};

/* =========================================================
   🔐 AUTH MIDDLEWARE (FULLY HARDENED)
========================================================= */
export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const requestId = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  try {
    /* =========================
       1. HEADER VALIDATION
    ========================= */
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return fail(res, "Missing or invalid Authorization header", 401, {
        requestId,
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return fail(res, "Token missing", 401, { requestId });
    }

    req.token = token;

    /* =========================
       2. SECRET VALIDATION
    ========================= */
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("❌ JWT_SECRET not configured");
      return fail(res, "Server configuration error", 500, {
        requestId,
      });
    }

    /* =========================
       3. VERIFY TOKEN
    ========================= */
    let decoded: DecodedToken;

    try {
      decoded = jwt.verify(token, secret) as DecodedToken;
    } catch (err: unknown) {
      if (isJwtError(err)) {
        if (err.name === "TokenExpiredError") {
          return fail(res, "Token expired", 401, {
            requestId,
          });
        }

        if (err.name === "JsonWebTokenError") {
          return fail(res, "Invalid token", 401, {
            requestId,
          });
        }
      }

      return fail(res, "Token verification failed", 401, {
        requestId,
      });
    }

    if (!decoded?.id) {
      return fail(res, "Malformed token payload", 401, {
        requestId,
      });
    }

    /* =========================
       4. FETCH USER (SECURE)
    ========================= */
    const user = await User.findById(decoded.id)
      .select("-password -__v")
      .lean();

    if (!user) {
      return fail(res, "User not found (stale token)", 401, {
        requestId,
      });
    }

    /* =========================
       5. ACCOUNT STATUS CHECK
    ========================= */
    if ((user as any).isBlocked) {
      return fail(res, "Account is blocked", 403, {
        requestId,
      });
    }

    /* =========================
       6. ATTACH USER (SAFE)
    ========================= */
    req.user = {
      _id: user._id.toString(),
      email: user.email,
      role: (user as any).role || "user",
    };

    return next();
  } catch (err) {
    console.error(`[AUTH CRASH ${requestId}]`, err);

    return fail(res, "Authentication system error", 500, {
      requestId,
    });
  }
};