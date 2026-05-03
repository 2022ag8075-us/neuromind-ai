import { Request, Response } from "express";
import mongoose from "mongoose";
import { groq } from "../config/groq.js";
import { Chat, IMessage } from "../models/chatModel.js";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

/* =========================================================
   🔐 AUTH TYPE
========================================================= */
export interface AuthRequest extends Request {
  user?: { _id: string };
}

/* =========================================================
   ⚙️ CONFIG (HARDENED)
========================================================= */
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const MAX_CONTEXT = 15;
const MAX_TOKENS = 1500; // 🔥 increased
const MAX_DB_MESSAGES = 200;
const SUMMARY_TRIGGER = 25;
const TIMEOUT_MS = 30000;

/* =========================================================
   🧠 SYSTEM PROMPT
========================================================= */
const SYSTEM_PROMPT: ChatCompletionMessageParam = {
  role: "system",
  content:
    
    "You are a helpful and concise assistant for mental wellness support. Always respond with empathy and understanding. Keep answers brief and to the point.",
};

/* =========================================================
   🧩 SAFE UTILITIES (NO SILENT FAILS)
========================================================= */

const safeMessage = (msg: unknown): string | null => {
  if (typeof msg !== "string") return null;
  const clean = msg.trim();
  if (!clean || clean.length > 4000) return null;
  return clean;
};

const isValidObjectId = (id: any): boolean =>
  mongoose.Types.ObjectId.isValid(id);

const createSessionId = () =>
  `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

/* HARD TIMEOUT WRAPPER */
const timeout = async <T>(
  promise: Promise<T>,
  ms: number
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("AI_TIMEOUT"));
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

/* SAFE AI RESPONSE EXTRACTOR */
const extractAIText = (res: any): string => {
  return (
    res?.choices?.[0]?.message?.content ||
    res?.choices?.[0]?.delta?.content ||
    ""
  );
};

/* =========================================================
   🧠 BUILD CONTEXT
========================================================= */
const buildMessages = (
  messages: IMessage[],
  summary?: string
): ChatCompletionMessageParam[] => {
  const base: ChatCompletionMessageParam[] = [SYSTEM_PROMPT];

  if (summary) {
    base.push({
      role: "system",
      content: `Conversation summary:\n${summary}`,
    });
  }

  return [
    ...base,
    ...messages.slice(-MAX_CONTEXT).map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];
};

/* =========================================================
   🧠 MEMORY CONTROL
========================================================= */
const trimMemory = (chat: any) => {
  if (!chat?.messages) return;
  if (chat.messages.length > MAX_DB_MESSAGES) {
    chat.messages = chat.messages.slice(-MAX_DB_MESSAGES);
  }
};

/* =========================================================
   🧠 SAFE SUMMARY (NO CRASH)
========================================================= */
const summarizeMemory = async (chat: any) => {
  try {
    if (!chat?.messages || chat.messages.length < SUMMARY_TRIGGER) return;

    const input = chat.messages
      .slice(0, 30)
      .map((m: any) => `${m.role}: ${m.content}`)
      .join("\n");

    const res = await timeout(
      groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Summarize in 5 bullet points." },
          { role: "user", content: input },
        ],
        max_tokens: 200,
      }),
      TIMEOUT_MS
    );

    const summary = extractAIText(res);
    if (summary) chat.summary = summary;
  } catch (err) {
    console.warn("[SUMMARY ERROR]", err);
  }
};

/* =========================================================
   🏷️ TITLE GENERATION (SAFE)
========================================================= */
const generateTitleSafe = async (chat: any, text: string) => {
  try {
    const res = await timeout(
      groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Create a short 4-6 word title" },
          { role: "user", content: text },
        ],
        max_tokens: 20,
      }),
      TIMEOUT_MS
    );

    const title = extractAIText(res);

    chat.title = title?.trim() || text.slice(0, 40);
    await chat.save();
  } catch (err) {
    console.warn("[TITLE ERROR]", err);
    try {
      chat.title = text.slice(0, 40);
      await chat.save();
    } catch {}
  }
};

/* =========================================================
   💬 CHAT (NON-STREAM - PRODUCTION SAFE)
========================================================= */
export const chatWithAI = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const clean = safeMessage(req.body.message);
    if (!clean) {
      return res.status(400).json({
        success: false,
        message: "Invalid message",
      });
    }

    const sessionId =
      typeof req.body.sessionId === "string" && req.body.sessionId
        ? req.body.sessionId
        : createSessionId();

    const chat = await Chat.findOrCreateSession(
      new mongoose.Types.ObjectId(userId),
      sessionId
    );

    if (!chat) {
      return res.status(500).json({
        success: false,
        message: "Chat session failed",
      });
    }

    chat.messages.push({ role: "user", content: clean });
    trimMemory(chat);

    let aiResponse;

    try {
      const completion = await timeout(
        groq.chat.completions.create({
          model: MODEL,
          messages: buildMessages(chat.messages, chat.summary),
          temperature: 0.7,
          max_tokens: MAX_TOKENS,
        }),
        TIMEOUT_MS
      );

      aiResponse = extractAIText(completion);
    } catch (err) {
      console.error("[AI ERROR]", err);
      aiResponse = "I'm here for you. Please try again.";
    }

    if (!aiResponse) aiResponse = "I'm here for you.";

    chat.messages.push({ role: "assistant", content: aiResponse });
    chat.lastMessage = aiResponse.slice(0, 120);

    if (!chat.title) {
      generateTitleSafe(chat, clean);
    }

    summarizeMemory(chat);

    await chat.save();

    return res.json({
      success: true,
      reply: aiResponse,
      sessionId,
    });
  } catch (err) {
    console.error("[CHAT FATAL ERROR]", err);

    return res.status(500).json({
      success: false,
      message: "Chat service error",
    });
  }
};

/* =========================================================
   🔴 STREAM CHAT (CRASH-PROOF SSE)
========================================================= */
export const streamChatWithAI = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).end();
    }

    const clean = safeMessage(req.body.message);
    if (!clean) return res.status(400).end();

    const sessionId =
      typeof req.body.sessionId === "string" && req.body.sessionId
        ? req.body.sessionId
        : createSessionId();

    const chat = await Chat.findOrCreateSession(
      new mongoose.Types.ObjectId(userId),
      sessionId
    );

    chat.messages.push({ role: "user", content: clean });
    trimMemory(chat);

    let full = "";

    let stream;

    try {
      stream = await timeout(
        groq.chat.completions.create({
          model: MODEL,
          messages: buildMessages(chat.messages, chat.summary),
          stream: true,
          max_tokens: MAX_TOKENS,
        }),
        TIMEOUT_MS
      );
    } catch (err) {
      console.error("[STREAM INIT ERROR]", err);
      res.write(`data: ${JSON.stringify({ error: true })}\n\n`);
      return res.end();
    }

    try {
      for await (const chunk of stream as any) {
        if (res.writableEnded) break;

        const token = chunk?.choices?.[0]?.delta?.content;
        if (!token) continue;

        full += token;

        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    } catch (err) {
      console.error("[STREAM LOOP ERROR]", err);
    }

    chat.messages.push({ role: "assistant", content: full || "..." });
    chat.lastMessage = full.slice(0, 120);

    summarizeMemory(chat);
    await chat.save();

    res.write(
      `data: ${JSON.stringify({ done: true, sessionId })}\n\n`
    );
    res.end();
  } catch (err) {
    console.error("[STREAM FATAL]", err);

    if (!res.headersSent) {
      res.status(500).end();
    } else if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: true })}\n\n`);
      res.end();
    }
  }
};

/* =========================================================
   📂 SAFE APIs
========================================================= */

export const getChatSessions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!isValidObjectId(userId)) {
      return res.status(401).json({ success: false });
    }

    const chats = await Chat.find({ user: userId })
      .sort({ pinned: -1, updatedAt: -1 })
      .select("sessionId title lastMessage updatedAt pinned")
      .lean();

    return res.json({ success: true, data: chats || [] });
  } catch (err) {
    console.error("[SESSIONS ERROR]", err);
    return res.status(500).json({ success: false });
  }
};

export const getChatBySession = async (req: AuthRequest, res: Response) => {
  try {
    const chat = await Chat.findOne({
      user: req.user?._id,
      sessionId: req.params.sessionId,
    }).lean();

    return res.json({
      success: true,
      data: chat?.messages || [],
      sessionId: req.params.sessionId,
    });
  } catch (err) {
    console.error("[GET CHAT ERROR]", err);
    return res.status(500).json({ success: false });
  }
};

export const deleteChatSession = async (req: AuthRequest, res: Response) => {
  try {
    await Chat.deleteOne({
      user: req.user?._id,
      sessionId: req.params.sessionId,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("[DELETE ERROR]", err);
    return res.status(500).json({ success: false });
  }
};

export const clearChatHistory = async (req: AuthRequest, res: Response) => {
  try {
    await Chat.deleteMany({ user: req.user?._id });
    return res.json({ success: true });
  } catch (err) {
    console.error("[CLEAR ERROR]", err);
    return res.status(500).json({ success: false });
  }
};