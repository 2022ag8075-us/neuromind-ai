import { Request, Response } from "express";
import { groq } from "../config/groq.js";

export const unifiedStream = async (req: Request, res: Response) => {
  const controller = new AbortController();

  try {
    const { message } = req.body ?? {};

    // ==============================
    // 🧠 VALIDATION
    // ==============================
    if (typeof message !== "string" || !message.trim()) {
      res.status(400).json({
        success: false,
        message: "Invalid or missing message",
      });
      return;
    }

    const model = process.env.GROQ_MODEL;

    if (!model) {
      res.status(500).json({
        success: false,
        message: "GROQ_MODEL is not defined",
      });
      return;
    }

    // ==============================
    // 🔴 SSE HEADERS
    // ==============================
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    res.flushHeaders?.();

    // ==============================
    // ❤️ CLEAN DISCONNECT HANDLING
    // ==============================
    req.on("close", () => {
      controller.abort();
      if (!res.writableEnded) {
        res.end();
      }
    });

    // ==============================
    // 🤖 GROQ STREAM (FIXED OVERLOAD)
    // ==============================
    const completion = await groq.chat.completions.create({
      model,
      messages: [{ role: "user", content: message }],
      stream: true as const, // 🔥 IMPORTANT FIX
    });

    for await (const chunk of completion) {
      if (res.writableEnded) break;

      const token = chunk.choices?.[0]?.delta?.content;

      if (token) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }

    // ==============================
    // ✅ DONE EVENT
    // ==============================
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  } catch (err: any) {
    console.error("STREAM ERROR:", err);

    // ==============================
    // ⚠️ SAFE ERROR HANDLING
    // ==============================
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Streaming failed",
      });
      return;
    }

    if (!res.writableEnded) {
      res.write(
        `data: ${JSON.stringify({
          error: "stream_failed",
        })}\n\n`
      );
      res.end();
    }
  }
};