import { Request, Response } from "express";
import { groq } from "../config/groq.js";
import fs from "fs/promises";
import path from "path";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

/**
 * ==============================
 * 🔐 AUTH REQUEST TYPE
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
 * 🎤 STT ENGINE (PLUGGABLE)
 * ==============================
 * 👉 Replace this later with:
 * - OpenAI Whisper API
 * - Groq Whisper (future)
 * - AssemblyAI
 * - Deepgram
 */
const transcribeAudio = async (filePath: string): Promise<string> => {
  try {
    // 🔥 TEMP SAFE MOCK (NO CRASH)
    // Replace with real STT later
    return "User sent a voice message";
  } catch (err) {
    console.error("STT ERROR:", err);
    return "";
  }
};

/**
 * ==============================
 * 🧹 SAFE FILE DELETE
 * ==============================
 */
const safeDeleteFile = async (filePath?: string) => {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (err) {
    // silent fail (important for production stability)
    console.warn("FILE DELETE FAILED:", filePath);
  }
};

/**
 * ==============================
 * 🧠 CLEAN TEXT VALIDATION
 * ==============================
 */
const safeText = (text: string): string | null => {
  if (!text || typeof text !== "string") return null;

  const clean = text.trim();

  if (!clean) return null;
  if (clean.length > 4000) return null;

  return clean;
};

/**
 * ==============================
 * 🎤 AUDIO → AI PIPELINE (ELITE)
 * ==============================
 */
export const chatWithAudio = async (req: AuthRequest, res: Response) => {
  const file = req.file;

  if (!file?.path) {
    return res.status(400).json({
      success: false,
      message: "Audio file missing",
    });
  }

  const filePath = file.path;

  try {
    /**
     * ==============================
     * 🎤 STEP 1: TRANSCRIPTION
     * ==============================
     */
    const transcript = await transcribeAudio(filePath);

    const cleanTranscript = safeText(transcript);

    if (!cleanTranscript) {
      await safeDeleteFile(filePath);

      return res.status(400).json({
        success: false,
        message: "Could not transcribe audio",
      });
    }

    /**
     * ==============================
     * 🧠 STEP 2: AI RESPONSE
     * ==============================
     */
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          "You are NeuroMind AI. You respond in a calm, supportive, mental wellness tone. Keep responses concise and helpful.",
      },
      {
        role: "user",
        content: cleanTranscript,
      },
    ];

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 600,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I couldn't understand that clearly.";

    /**
     * ==============================
     * 🧹 STEP 3: CLEANUP (SAFE)
     * ==============================
     */
    await safeDeleteFile(filePath);

    /**
     * ==============================
     * 📦 RESPONSE
     * ==============================
     */
    return res.json({
      success: true,
      transcript: cleanTranscript,
      reply,
    });
  } catch (err) {
    console.error("AUDIO CONTROLLER ERROR:", err);

    await safeDeleteFile(filePath);

    return res.status(500).json({
      success: false,
      message: "Audio processing failed",
    });
  }
};