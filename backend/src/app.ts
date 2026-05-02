import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";

import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import moodRoutes from "./routes/moodRoutes.js";
import unifiedAiRoutes from "./routes/unifiedAiRoutes.js";

dotenv.config();

const app = express();

/**
 * ==============================
 * 🔐 ENV VALIDATION (STRICT)
 * ==============================
 */
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET"];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌ Missing ENV: ${key}`);
    process.exit(1);
  }
}

/**
 * ==============================
 * 📁 ENSURE UPLOADS FOLDER
 * ==============================
 */
const uploadsDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log("📁 uploads folder created");
}

/**
 * ==============================
 * 🛡️ SECURITY LAYER
 * ==============================
 */
app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: false, // allow media (images/audio)
  })
);

app.use(compression());

/**
 * ==============================
 * 🚦 GLOBAL RATE LIMIT
 * ==============================
 */
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/**
 * ==============================
 * 🌐 CORS (SMART CONFIG)
 * ==============================
 */
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://your-domain.com"] // 🔁 change in prod
        : "*",
    credentials: true,
  })
);

/**
 * ==============================
 * 🧠 BODY PARSER (SAFE LIMITS)
 * ==============================
 */
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

/**
 * ==============================
 * 📊 LOGGER
 * ==============================
 */
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

/**
 * ==============================
 * ⏱️ REQUEST TIMEOUT PROTECTION
 * ==============================
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setTimeout(30000, () => {
    console.warn(`⏰ Timeout: ${req.method} ${req.originalUrl}`);
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        message: "Request timeout",
      });
    }
  });
  next();
});

/**
 * ==============================
 * 📡 ROUTES
 * ==============================
 */
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/mood", moodRoutes);

/**
 * 🧠 UNIFIED AI (TEXT + AUDIO + IMAGE)
 */
app.use("/api/ai", unifiedAiRoutes);

/**
 * ==============================
 * 📁 STATIC FILES (UPLOADS ACCESS)
 * ==============================
 */
app.use("/uploads", express.static(uploadsDir));

/**
 * ==============================
 * ❤️ HEALTH CHECK
 * ==============================
 */
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    service: "NeuroMind AI",
    status: "running",
    uptime: process.uptime(),
    time: new Date().toISOString(),
  });
});

/**
 * ==============================
 * 🧨 ROOT
 * ==============================
 */
app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "NeuroMind AI API is running 🚀",
  });
});

/**
 * ==============================
 * ❌ 404 HANDLER
 * ==============================
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/**
 * ==============================
 * 🚨 GLOBAL ERROR HANDLER
 * ==============================
 */
app.use(
  (err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error("🔥 GLOBAL ERROR:", err);

    if (res.headersSent) return;

    const status = err.status || 500;

    res.status(status).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Internal Server Error"
          : err.message,
    });
  }
);

export default app;