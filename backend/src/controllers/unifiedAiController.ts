import { Request, Response, RequestHandler } from "express";
import fs from "fs/promises";
import mongoose from "mongoose";

import { groq } from "../config/groq.js";
import { Chat } from "../models/chatModel.js";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

/* =========================================================
   🔐 EXTENDED REQUEST TYPE
========================================================= */
interface AuthRequest extends Request {
  user?: { _id: string };
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>;
}

/* =========================================================
   ⚙️ CONFIG
========================================================= */
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const MAX_CONTEXT = 14;
const MAX_INPUT_LENGTH = 4000;
const AI_TIMEOUT = 25000;

/* =========================================================
   🧠 MEMORY FALLBACK (IN CASE DB FAILS)
========================================================= */
const memoryStore = new Map<string, any>();

/* =========================================================
   🧠 SAFE HELPERS
========================================================= */
const safeText = (val: unknown): string | null => {
  if (typeof val !== "string") return null;
  const clean = val.trim();
  if (!clean || clean.length > MAX_INPUT_LENGTH) return null;
  return clean;
};

const isValidObjectId = (id: any) =>
  mongoose.Types.ObjectId.isValid(id);

const createSessionId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const sleep = (ms: number) =>
  new Promise((r) => setTimeout(r, ms));

/* =========================================================
   ⏱ TIMEOUT WRAPPER (SAFE)
========================================================= */
const withTimeout = async <T>(promise: Promise<T>): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI_TIMEOUT")), AI_TIMEOUT)
    ),
  ]);
};

/* =========================================================
   🔁 RETRY AI ENGINE (NEW)
========================================================= */
const callAIWithRetry = async (
  messages: ChatCompletionMessageParam[]
): Promise<string> => {
  let lastError: any;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await withTimeout(
        groq.chat.completions.create({
          model: MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 900,
        })
      );

      const reply =
        res?.choices?.[0]?.message?.content?.trim();

      if (reply) return reply;
    } catch (err) {
      lastError = err;
      console.warn(`[AI RETRY ${attempt}] failed`);
      await sleep(300);
    }
  }

  throw lastError;
};

/* =========================================================
   🧹 SAFE FILE DELETE
========================================================= */
const safeDelete = async (path?: string) => {
  if (!path) return;
  try {
    await fs.unlink(path);
  } catch {}
};

/* =========================================================
   🧠 CONTEXT BUILDER
========================================================= */
const buildContext = (messages: any[]): ChatCompletionMessageParam[] =>
  messages.slice(-MAX_CONTEXT).map((m) => ({
    role: m.role,
    content: m.content,
  }));

/* =========================================================
   🚀 MAIN CONTROLLER (HARDENED)
========================================================= */
export const unifiedChat: RequestHandler = async (
  req: AuthRequest,
  res: Response
) => {
  const requestId = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  let sessionId = "";

  try {
    /* =========================
       🔐 AUTH CHECK
    ========================= */
    if (!req.user?._id || !isValidObjectId(req.user._id)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        requestId,
      });
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);

    /* =========================
       📦 INPUT SAFE
    ========================= */
    const text = safeText(req.body?.message);

    let files: Express.Multer.File[] = [];

    if (Array.isArray(req.files)) {
      files = req.files;
    } else if (req.files && typeof req.files === "object") {
      files = Object.values(req.files).flat();
    } else if (req.file) {
      files = [req.file];
    }

    const audio = files.find((f) =>
      f.mimetype.startsWith("audio")
    );
    const image = files.find((f) =>
      f.mimetype.startsWith("image")
    );

    let finalInput = "";

    if (audio?.path) {
      finalInput += "🎤 Voice message received\n";
      await safeDelete(audio.path);
    }

    if (image?.path) {
      finalInput += "🖼 Image received\n";
      await safeDelete(image.path);
    }

    if (text) finalInput += `💬 ${text}`;

    if (!finalInput.trim()) {
      return res.status(400).json({
        success: false,
        message: "No valid input provided",
        requestId,
      });
    }

    /* =========================
       💾 SESSION (DB + FALLBACK)
    ========================= */
    sessionId =
      typeof req.body?.sessionId === "string" &&
      req.body.sessionId.trim()
        ? req.body.sessionId
        : createSessionId();

    let chat: any;

    try {
      chat = await Chat.findOrCreateSession(userId, sessionId);
    } catch (err) {
      console.error("[DB FALLBACK MODE]");
      chat = memoryStore.get(sessionId) || {
        messages: [],
        sessionId,
      };
      memoryStore.set(sessionId, chat);
    }

    chat.messages.push({
      role: "user",
      content: finalInput,
    });

    /* =========================
       🧠 AI CALL (RETRY SAFE)
    ========================= */
    let reply = "I'm here for you. Please try again.";

    try {
      reply = await callAIWithRetry([
        {
          role: "system",
          content:
            "You are NeuroMind AI. Calm, supportive assistant.",
        },
        ...buildContext(chat.messages),
      ]);
    } catch (err) {
      console.error("[AI TOTAL FAILURE]", err);
    }

    /* =========================
       💾 SAVE SAFE
    ========================= */
    chat.messages.push({
      role: "assistant",
      content: reply,
    });

    chat.lastMessage = reply.slice(0, 120);

    try {
      if (chat.save) await chat.save();
      else memoryStore.set(sessionId, chat);
    } catch (err) {
      console.error("[SAVE FAILED]", err);
    }

    /* =========================
       📦 RESPONSE
    ========================= */
    return res.json({
      success: true,
      sessionId,
      reply,
      requestId,
      meta: {
        mode: "hardened",
        fallbackUsed: !chat.save,
      },
    });
  } catch (err) {
    console.error(`[UNIFIED AI CRASH ${requestId}]`, err);

    return res.status(500).json({
      success: false,
      message: "System error occurred",
      requestId,
    });
  }
};