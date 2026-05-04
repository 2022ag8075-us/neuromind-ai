import { Request, Response } from "express";
import mongoose from "mongoose";
import { groq } from "../config/groq.js";
import { Chat, IMessage } from "../models/chatModel.js";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

/* =========================================================
   🔐 TYPES
========================================================= */
export interface AuthRequest extends Request {
  user?: { _id: string };
  id?: string; // request tracing
}

/* =========================================================
   ⚙️ CONFIG
========================================================= */
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const CONFIG = {
  MAX_CONTEXT: 15,
  MAX_TOKENS: 1500,
  MAX_DB_MESSAGES: 200,
  SUMMARY_TRIGGER: 25,
  TIMEOUT_MS: 30000,
  RETRY_COUNT: 2,
};

/* =========================================================
   🧠 SYSTEM PROMPT
========================================================= */
const SYSTEM_PROMPT: ChatCompletionMessageParam = {
  role: "system",
  content:
    "You are NeuroMind AI. A calm, empathetic, non-diagnostic mental wellness assistant. Keep responses short, supportive, and safe.",
};

/* =========================================================
   🧩 UTILITIES
========================================================= */
const safeMessage = (msg: unknown): string | null => {
  if (typeof msg !== "string") return null;
  const clean = msg.trim();
  if (!clean || clean.length > 4000) return null;
  return clean;
};

const isValidObjectId = (id: any) =>
  mongoose.Types.ObjectId.isValid(id);

const createSessionId = () =>
  `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const sleep = (ms: number) =>
  new Promise((res) => setTimeout(res, ms));

/* =========================================================
   ⏱ TIMEOUT WRAPPER
========================================================= */
const withTimeout = async <T>(
  promise: Promise<T>,
  ms: number
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("AI_TIMEOUT")), ms)
    ),
  ]);
};

/* =========================================================
   🔁 RETRY WRAPPER (CRITICAL)
========================================================= */
const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = CONFIG.RETRY_COUNT
): Promise<T> => {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await sleep(500 * (i + 1));
    }
  }
  throw lastErr;
};

/* =========================================================
   🧠 EXTRACT TEXT
========================================================= */
const extractAIText = (res: any): string =>
  res?.choices?.[0]?.message?.content ||
  res?.choices?.[0]?.delta?.content ||
  "";

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
      content: `Summary:\n${summary}`,
    });
  }

  return [
    ...base,
    ...messages.slice(-CONFIG.MAX_CONTEXT).map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];
};

/* =========================================================
   🧠 MEMORY CONTROL
========================================================= */
const trimMemory = (chat: any) => {
  if (chat.messages.length > CONFIG.MAX_DB_MESSAGES) {
    chat.messages = chat.messages.slice(
      -CONFIG.MAX_DB_MESSAGES
    );
  }
};

/* =========================================================
   🧠 SUMMARY
========================================================= */
const summarizeMemory = async (chat: any) => {
  if (chat.messages.length < CONFIG.SUMMARY_TRIGGER) return;

  try {
    const input = chat.messages
      .slice(0, 30)
      .map((m: any) => `${m.role}: ${m.content}`)
      .join("\n");

    const res = await withRetry(() =>
      withTimeout(
        groq.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: "Summarize briefly." },
            { role: "user", content: input },
          ],
          max_tokens: 150,
        }),
        CONFIG.TIMEOUT_MS
      )
    );

    chat.summary = extractAIText(res);
  } catch (err) {
    console.warn("⚠️ Summary failed");
  }
};

/* =========================================================
   🏷 TITLE GENERATION
========================================================= */
const generateTitle = async (chat: any, text: string) => {
  try {
    const res = await withTimeout(
      groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Short title (4-6 words)" },
          { role: "user", content: text },
        ],
        max_tokens: 20,
      }),
      CONFIG.TIMEOUT_MS
    );

    chat.title = extractAIText(res) || text.slice(0, 40);
  } catch {
    chat.title = text.slice(0, 40);
  }
};

/* =========================================================
   💬 CHAT (NON-STREAM)
========================================================= */
export const chatWithAI = async (
  req: AuthRequest,
  res: Response
) => {
  const requestId = req.id || Date.now().toString();

  try {
    const userId = req.user?._id;

    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ success: false });
    }

    const clean = safeMessage(req.body.message);
    if (!clean) {
      return res.status(400).json({ success: false });
    }

    const sessionId =
      req.body.sessionId || createSessionId();

    const chat = await Chat.findOrCreateSession(
      new mongoose.Types.ObjectId(userId),
      sessionId
    );

    chat.messages.push({ role: "user", content: clean });
    trimMemory(chat);

    let aiResponse = "";

    try {
      const completion = await withRetry(() =>
        withTimeout(
          groq.chat.completions.create({
            model: MODEL,
            messages: buildMessages(chat.messages, chat.summary),
            temperature: 0.7,
            max_tokens: CONFIG.MAX_TOKENS,
          }),
          CONFIG.TIMEOUT_MS
        )
      );

      aiResponse = extractAIText(completion);
    } catch (err) {
      console.error("AI FAIL:", requestId);
      aiResponse = "I'm here for you. Try again.";
    }

    chat.messages.push({ role: "assistant", content: aiResponse });
    chat.lastMessage = aiResponse.slice(0, 120);

    if (!chat.title) await generateTitle(chat, clean);
    await summarizeMemory(chat);

    await chat.save();

    return res.json({ success: true, reply: aiResponse, sessionId });

  } catch (err) {
    console.error("FATAL:", requestId, err);
    return res.status(500).json({ success: false });
  }
};

/* =========================================================
   🔴 STREAM (SSE ADVANCED)
========================================================= */
export const streamChatWithAI = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    /* SSE HEADERS (CRITICAL FIX) */
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const userId = req.user?._id;
    if (!isValidObjectId(userId)) return res.end();

    const clean = safeMessage(req.body.message);
    if (!clean) return res.end();

    const sessionId =
      req.body.sessionId || createSessionId();

    const chat = await Chat.findOrCreateSession(
      new mongoose.Types.ObjectId(userId),
      sessionId
    );

    chat.messages.push({ role: "user", content: clean });

    let full = "";

    const stream = await groq.chat.completions.create({
      model: MODEL,
      messages: buildMessages(chat.messages, chat.summary),
      stream: true,
      max_tokens: CONFIG.MAX_TOKENS,
    });

    for await (const chunk of stream as any) {
      if (res.writableEnded) break;

      const token = chunk?.choices?.[0]?.delta?.content;
      if (!token) continue;

      full += token;

      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }

    chat.messages.push({ role: "assistant", content: full });
    await chat.save();

    res.write(`data: ${JSON.stringify({ done: true, sessionId })}\n\n`);
    res.end();

  } catch (err) {
    console.error("STREAM ERROR:", err);
    if (!res.writableEnded) res.end();
  }
};

/* =========================================================
   📂 SESSION APIs
========================================================= */
export const getChatSessions = async (req: AuthRequest, res: Response) => {
  const chats = await Chat.find({ user: req.user?._id })
    .sort({ updatedAt: -1 })
    .select("sessionId title lastMessage updatedAt")
    .lean();

  res.json({ success: true, data: chats });
};

export const getChatBySession = async (req: AuthRequest, res: Response) => {
  const chat = await Chat.findOne({
    user: req.user?._id,
    sessionId: req.params.sessionId,
  }).lean();

  res.json({ success: true, data: chat?.messages || [] });
};

export const deleteChatSession = async (req: AuthRequest, res: Response) => {
  await Chat.deleteOne({
    user: req.user?._id,
    sessionId: req.params.sessionId,
  });

  res.json({ success: true });
};

export const clearChatHistory = async (req: AuthRequest, res: Response) => {
  await Chat.deleteMany({ user: req.user?._id });
  res.json({ success: true });
};