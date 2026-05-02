import { Request, Response } from "express";
import { groq } from "../config/groq.js";
import fs from "fs/promises";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

/**
 * ==============================
 * 🔐 SAFE REQUEST TYPE
 * ==============================
 */
interface AuthRequest extends Request {
  user?: {
    _id: string;
  };
}

/**
 * ==============================
 * 🔒 ENV SAFE
 * ==============================
 */
const getEnv = (key: string, fallback = ""): string => {
  const val = process.env[key];
  return typeof val === "string" && val.trim() ? val : fallback;
};

const MODEL = getEnv("GROQ_MODEL", "llama-3.3-70b-versatile");

/**
 * ==============================
 * 🧠 FILE VALIDATION (HARD SAFE)
 * ==============================
 */
const isValidImage = (
  file?: Express.Multer.File
): file is Express.Multer.File => {
  if (!file) return false;

  const allowedMime = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
  ]);

  return allowedMime.has(file.mimetype);
};

/**
 * ==============================
 * 🧹 SAFE FILE DELETE (CRASH PROOF)
 * ==============================
 */
const safeDelete = async (filePath?: string) => {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch {
    // silent fail (production-safe)
  }
};

/**
 * ==============================
 * 🧠 IMAGE → BASE64
 * ==============================
 */
const imageToBase64 = async (filePath: string) => {
  const buffer = await fs.readFile(filePath);
  return buffer.toString("base64");
};

/**
 * ==============================
 * 🖼 ELITE IMAGE ANALYZER
 * ==============================
 */
export const analyzeImage = async (req: AuthRequest, res: Response) => {
  const file = req.file;

  /**
   * ❌ HARD GUARD (FIXES TS + runtime issues)
   */
  if (!isValidImage(file) || !file.path) {
    return res.status(400).json({
      success: false,
      message: "Invalid or missing image file",
    });
  }

  const filePath: string = file.path;

  try {
    /**
     * ==============================
     * 🧠 STEP 1: PREP IMAGE
     * ==============================
     */
    const base64Image = await imageToBase64(filePath);

    const mime = file.mimetype;

    /**
     * ==============================
     * 🧠 STEP 2: VISION PROMPT
     * ==============================
     * FUTURE-PROOF FORMAT (OpenAI / Groq Vision compatible)
     */
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          "You are NeuroMind Vision AI. Analyze images clearly, safely, and describe objects, emotions, and context.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this image in detail. Describe objects, context, and possible meaning.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mime};base64,${base64Image}`,
            },
          },
        ] as any,
      },
    ];

    /**
     * ==============================
     * 🧠 STEP 3: AI CALL
     * ==============================
     */
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 800,
    });

    const analysis =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Unable to analyze image at this time.";

    /**
     * ==============================
     * 🧹 STEP 4: CLEANUP (ALWAYS RUN)
     * ==============================
     */
    await safeDelete(filePath);

    /**
     * ==============================
     * 📦 RESPONSE (UNIFIED AI READY)
     * ==============================
     */
    return res.json({
      success: true,
      type: "vision-analysis",
      analysis,
    });
  } catch (err) {
    console.error("[IMAGE CONTROLLER ERROR]", err);

    /**
     * 🧹 GUARANTEED CLEANUP ON ERROR
     */
    await safeDelete(filePath);

    return res.status(500).json({
      success: false,
      message: "Image processing failed",
    });
  }
};