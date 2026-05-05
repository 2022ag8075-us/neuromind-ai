// src/config/env.ts

import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Validate required env vars
const requiredEnv = [
  "MONGO_URI",
  "JWT_SECRET",
  "GROQ_API_KEY"
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`❌ Missing ENV: ${key}`);
    process.exit(1); // stop app in production if missing
  }
}

export const ENV = {
  PORT: process.env.PORT || "5000",
  MONGO_URI: process.env.MONGO_URI!,
  JWT_SECRET: process.env.JWT_SECRET!,
  GROQ_API_KEY: process.env.GROQ_API_KEY!,
  GROQ_MODEL:
    process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
};

// Debug log (safe)
console.log(
  "✅ ENV LOADED:",
  process.env.GROQ_API_KEY ? "YES" : "NO"
);