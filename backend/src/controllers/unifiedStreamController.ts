import { Request, Response } from "express";
import { groq } from "../config/groq.js";
import mongoose from "mongoose";
import { Chat, IMessage } from "../models/chatModel.js"; // optional

// Minimal config – adjust as needed
const CONFIG = {
  MAX_CONTEXT: 15,          // conversation turns to keep
  MAX_TOKENS: 1500,
  TIMEOUT_MS: 30000,
};

export const unifiedStream = async (req: Request, res: Response) => {
  try {
    // ----------------------------------------------
    // 1. Input validation (with user auth optional)
    // ----------------------------------------------
    const { message, sessionId, userId } = req.body ?? {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing message",
      });
    }

    const model = process.env.GROQ_MODEL;
    if (!model) {
      return res.status(500).json({
        success: false,
        message: "GROQ_MODEL not defined",
      });
    }

    // ----------------------------------------------
    // 2. Optional: fetch previous chat context
    // ----------------------------------------------
    let chatHistory: IMessage[] = [];
    let summary: string | undefined;

    if (userId && mongoose.Types.ObjectId.isValid(userId) && sessionId) {
      const chat = await Chat.findOne({
        user: new mongoose.Types.ObjectId(userId),
        sessionId,
      }).lean();
      if (chat) {
        chatHistory = chat.messages.slice(-CONFIG.MAX_CONTEXT);
        summary = chat.summary;
      }
    }

    // Build messages array (system prompt + context + new user message)
    const messages = buildMessages(chatHistory, summary, message);

    // ----------------------------------------------
    // 3. SSE Headers (hardened)
    // ----------------------------------------------
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders?.();

    let hasTokens = false;
    let fullText = "";
    let heartbeat: NodeJS.Timeout | null = null;

    // Cleanup on client disconnect
    req.on("close", () => {
      if (heartbeat) clearInterval(heartbeat);
      if (!res.writableEnded) res.end();
    });

    // ----------------------------------------------
    // 4. Heartbeat (prevents proxy timeouts)
    // ----------------------------------------------
    heartbeat = setInterval(() => {
      if (!res.writableEnded) {
        res.write(": ping\n\n");
      }
    }, 15000);

    // First event → UI can show typing indicator immediately
    res.write(`data: ${JSON.stringify({ start: true })}\n\n`);

    // ----------------------------------------------
    // 5. Groq stream with retry + timeout wrapper
    // ----------------------------------------------
    const stream = await withTimeout(
      groq.chat.completions.create({
        model,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: CONFIG.MAX_TOKENS,
      }),
      CONFIG.TIMEOUT_MS
    );

    // ----------------------------------------------
    // 6. Stream loop (robust token extraction)
    // ----------------------------------------------
    for await (const chunk of stream as any) {
      if (res.writableEnded) break;

      const token =
        chunk?.choices?.[0]?.delta?.content ??
        chunk?.choices?.[0]?.message?.content ??
        "";

      if (typeof token !== "string" || token.length === 0) continue;

      hasTokens = true;
      fullText += token;

      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }

    if (heartbeat) clearInterval(heartbeat);

    // ----------------------------------------------
    // 7. Guarantee non-empty response
    // ----------------------------------------------
    if (!hasTokens || fullText.trim().length === 0) {
      fullText = "I'm here for you. Please try again.";
      res.write(`data: ${JSON.stringify({ token: fullText })}\n\n`);
    }

    // ----------------------------------------------
    // 8. Optional: persist to database
    // ----------------------------------------------
    if (userId && mongoose.Types.ObjectId.isValid(userId) && sessionId) {
      await Chat.findOneAndUpdate(
        { user: new mongoose.Types.ObjectId(userId), sessionId },
        {
          $push: {
            messages: {
              $each: [
                { role: "user", content: message },
                { role: "assistant", content: fullText },
              ],
            },
          },
          $set: { lastMessage: fullText.slice(0, 120), updatedAt: new Date() },
        },
        { upsert: true }
      );
    }

    // ----------------------------------------------
    // 9. Final events
    // ----------------------------------------------
    res.write(
      `data: ${JSON.stringify({
        done: true,
        full: fullText,
        sessionId: sessionId || null,
      })}\n\n`
    );
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("STREAM ERROR:", err);

    if (!res.writableEnded) {
      res.write(
        `data: ${JSON.stringify({
          error: "stream_failed",
          message: err instanceof Error ? err.message : "Unknown error",
        })}\n\n`
      );
      res.end();
    }
  }
};

// -------------------------------
// Helper: build messages with context
// -------------------------------
const buildMessages = (
  history: IMessage[],
  summary: string | undefined,
  newMessage: string
) => {
  const systemPrompt = {
    role: "system",
    content:
      "You are NeuroMind AI. A calm, empathetic, non-diagnostic mental wellness assistant. Keep responses short, supportive, and safe.",
  };

  const messages: any[] = [systemPrompt];

  if (summary) {
    messages.push({
      role: "system",
      content: `Previous conversation summary:\n${summary}`,
    });
  }

  // Add last N turns from history
  messages.push(...history.map((m) => ({ role: m.role, content: m.content })));

  // Add current user message
  messages.push({ role: "user", content: newMessage });

  return messages;
};

// -------------------------------
// Helper: timeout wrapper
// -------------------------------
const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    ),
  ]);
};