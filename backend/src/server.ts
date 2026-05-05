import "./config/env.js";

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import path from "path";
import fs from "fs";

import { connectDB } from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import moodRoutes from "./routes/moodRoutes.js";
import unifiedAiRoutes from "./routes/unifiedAiRoutes.js";

/* =========================================================
   🚀 APP INIT
========================================================= */
const app = express();
const isProd = process.env.NODE_ENV === "production";

/* =========================================================
   🌍 TRUST PROXY (IMPORTANT FOR RAILWAY / CLOUD)
========================================================= */
app.set("trust proxy", 1);

/* =========================================================
   🔐 ENV VALIDATION (STRICT)
========================================================= */
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET"];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌ Missing ENV: ${key}`);
    process.exit(1);
  }
}

/* =========================================================
   ⚙️ PORT CONFIG (SINGLE SOURCE OF TRUTH)
========================================================= */
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

/* =========================================================
   📁 UPLOAD DIRECTORY SAFETY
========================================================= */
const uploadsDir = path.join(process.cwd(), "uploads");

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("📁 uploads directory created");
  }
} catch (err) {
  console.error("❌ Failed to create uploads dir:", err);
  process.exit(1);
}

/* =========================================================
   🛡️ SECURITY HARDENING
========================================================= */
app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: isProd ? undefined : false,
  })
);

app.use(compression());
app.use(mongoSanitize());
app.use(hpp());

/* =========================================================
   🚦 RATE LIMIT (PRODUCTION SAFE)
========================================================= */
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: isProd ? 80 : 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/* =========================================================
   🌐 CORS CONFIG
========================================================= */
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = process.env.ALLOWED_ORIGINS?.split(",") || ["*"];

      if (!origin || allowed.includes("*") || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS blocked"));
      }
    },
    credentials: true,
  })
);

/* =========================================================
   📦 BODY PARSER
========================================================= */
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

/* =========================================================
   ⏱️ REQUEST TIMEOUT
========================================================= */
app.use((req: Request, res: Response, next: NextFunction) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        message: "Request timeout",
      });
    }
  }, 30000);

  res.on("finish", () => clearTimeout(timeout));
  next();
});

/* =========================================================
   📊 DEV LOGGER
========================================================= */
if (!isProd) {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`➡️ ${req.method} ${req.originalUrl}`);
    next();
  });
}

/* =========================================================
   ❤️ ROOT + HEALTH CHECK (RAILWAY REQUIRED)
========================================================= */
app.get("/", (_req, res) => {
  res.status(200).send("NeuroMind API is running 🚀");
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/* =========================================================
   📡 ROUTES
========================================================= */
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/mood", moodRoutes);
app.use("/api/ai", unifiedAiRoutes);

/* =========================================================
   📁 STATIC FILES
========================================================= */
app.use("/uploads", express.static(uploadsDir));

/* =========================================================
   ❌ 404 HANDLER
========================================================= */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* =========================================================
   🚨 GLOBAL ERROR HANDLER
========================================================= */
app.use(
  (err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("🔥 ERROR:", err?.message);

    res.status(err?.status || 500).json({
      success: false,
      message: isProd
        ? "Internal Server Error"
        : err?.message || "Unknown error",
    });
  }
);

/* =========================================================
   ⚠️ PROCESS SAFETY
========================================================= */
process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});

/* =========================================================
   🚀 START SERVER
========================================================= */
let server: any;

const startServer = async () => {
  try {
    await connectDB();

    server = app.listen(PORT, "0.0.0.0", () => {
      console.log("=================================");
      console.log("🚀 NeuroMind API running");
      console.log(`🌐 Port: ${PORT}`);
      console.log("🔐 /api/auth");
      console.log("💬 /api/chat");
      console.log("🧠 /api/ai");
      console.log("📊 /api/mood");
      console.log("=================================");
    });
  } catch (err) {
    console.error("❌ SERVER START FAILED:", err);
    process.exit(1);
  }
};

startServer();

/* =========================================================
   🛑 GRACEFUL SHUTDOWN
========================================================= */
const shutdown = (signal: string) => {
  console.log(`⚠️ ${signal} received`);

  if (server) {
    server.close(() => {
      console.log("🛑 Server closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));