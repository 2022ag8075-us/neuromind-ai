import "express";

/**
 * =====================================================
 * 🧠 GLOBAL EXPRESS TYPE EXTENSION (PRODUCTION SAFE)
 * =====================================================
 */

declare global {
  namespace Express {
    /**
     * ==============================
     * 🔐 USER TYPE (FLEXIBLE + SAFE)
     * ==============================
     */
    interface User {
      _id: string;
      email?: string;

      /**
       * allow future roles without TS breaking
       */
      role?: string;
    }

    /**
     * ==============================
     * 📦 REQUEST EXTENSION
     * ==============================
     */
    interface Request {
      /**
       * 🧠 optional request tracing ID
       * (NOT required → avoids Express TS conflict)
       */
      id?: string;

      /**
       * 🔐 authenticated user
       */
      user?: User;

      /**
       * 💬 chat session tracking
       */
      sessionId?: string;

      /**
       * ⚡ optional metadata (AI / logs / analytics)
       */
      meta?: Record<string, unknown>;
    }
  }
}

/**
 * ==============================
 * 📦 MULTER COMPATIBILITY SAFETY
 * ==============================
 * (DO NOT override Express.Multer.File → prevents conflicts)
 */
declare module "express-serve-static-core" {
  interface Request {
    file?: Express.Multer.File;
    files?:
      | Express.Multer.File[]
      | { [fieldname: string]: Express.Multer.File[] };
  }
}

export {};