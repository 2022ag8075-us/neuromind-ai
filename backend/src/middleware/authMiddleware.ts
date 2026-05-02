import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../models/userModel.js";

/**
 * ==============================
 * 🔐 EXTENDED REQUEST TYPE
 * ==============================
 */
export interface AuthRequest extends Request {
  user?: any;
  token?: string;
}

/**
 * ==============================
 * 🧠 SAFE ERROR RESPONSE
 * ==============================
 */
const fail = (res: Response, message: string, code = 401) => {
  if (res.headersSent) return;
  return res.status(code).json({
    success: false,
    message,
  });
};

/**
 * ==============================
 * 🔐 AUTH MIDDLEWARE (PRODUCTION)
 * ==============================
 */
export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    /**
     * ==============================
     * 1. CHECK HEADER
     * ==============================
     */
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return fail(res, "Authorization header missing");
    }

    if (!authHeader.startsWith("Bearer ")) {
      return fail(res, "Invalid authorization format");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return fail(res, "Token missing");
    }

    req.token = token;

    /**
     * ==============================
     * 2. CHECK SECRET
     * ==============================
     */
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("❌ JWT_SECRET missing in env");
      return fail(res, "Server misconfiguration", 500);
    }

    /**
     * ==============================
     * 3. VERIFY TOKEN (SAFE)
     * ==============================
     */
    let decoded: JwtPayload & { id: string };

    try {
      decoded = jwt.verify(token, secret) as JwtPayload & {
        id: string;
      };
    } catch (err: any) {
      return fail(res, "Invalid or expired token");
    }

    if (!decoded?.id) {
      return fail(res, "Invalid token payload");
    }

    /**
     * ==============================
     * 4. FIND USER
     * ==============================
     */
    const user = await User.findById(decoded.id).select(
      "-password -__v"
    );

    if (!user) {
      return fail(res, "User not found");
    }

    /**
     * ==============================
     * 5. ATTACH USER
     * ==============================
     */
    req.user = user;

    return next();
  } catch (err: any) {
    console.error("❌ AUTH ERROR:", err);

    return fail(res, "Authentication failed");
  }
};