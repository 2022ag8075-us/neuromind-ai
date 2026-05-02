import express, { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { signup, login } from "../controllers/authController.js";

const router = express.Router();

/**
 * ==============================
 * 🚦 RATE LIMITING (ANTI BRUTE FORCE)
 * ==============================
 */
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 10, // strict for auth endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts, please try again later.",
  },
});

/**
 * ==============================
 * 🧱 SAFE WRAPPER
 * ==============================
 */
const asyncHandler =
  (fn: Function) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/**
 * ==============================
 * 🛡️ BASIC VALIDATION
 * ==============================
 */
const validateAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid input types",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters",
    });
  }

  next();
};

/**
 * ==============================
 * 🔐 AUTH ROUTES (PRODUCTION READY)
 * ==============================
 */

/**
 * REGISTER
 */
router.post(
  "/register",
  authLimiter,
  validateAuth,
  asyncHandler(signup)
);

/**
 * LOGIN
 */
router.post(
  "/login",
  authLimiter,
  validateAuth,
  asyncHandler(login)
);

/**
 * ==============================
 * 🧪 HEALTH CHECK
 * ==============================
 */
router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    service: "Auth Service",
    status: "running",
    time: new Date().toISOString(),
  });
});

/**
 * ==============================
 * ❌ 404 HANDLER (LOCAL SAFE)
 * ==============================
 */
router.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Auth route not found: ${req.originalUrl}`,
  });
});

export default router;