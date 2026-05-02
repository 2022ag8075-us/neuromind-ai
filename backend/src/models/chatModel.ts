import mongoose, { Document, Schema, Types, Model } from "mongoose";

/* =========================================================
   🧠 MESSAGE TYPE (PRODUCTION SAFE)
========================================================= */
export interface IMessage {
  role: "user" | "assistant";
  content: string;

  createdAt?: Date;

  isEdited?: boolean;

  attachments?: {
    type: "image" | "audio";
    url: string;
  }[];

  tokens?: number;
}

/* =========================================================
   💬 CHAT DOCUMENT
========================================================= */
export interface IChat extends Document {
  user: Types.ObjectId;
  sessionId: string;

  title: string;
  lastMessage: string;

  messages: IMessage[];

  createdAt: Date;
  updatedAt: Date;

  pinned: boolean;
  summary: string;
  tags: string[];

  memoryVersion: number;

  /* METHODS */
  addMessage(role: "user" | "assistant", content: string): void;
}

/* =========================================================
   🧠 MODEL TYPE
========================================================= */
interface ChatModel extends Model<IChat> {
  findOrCreateSession(
    userId: Types.ObjectId,
    sessionId: string
  ): Promise<IChat>;

  findUserSessions(userId: Types.ObjectId): Promise<IChat[]>;
}

/* =========================================================
   💬 MESSAGE SCHEMA (HARDENED)
========================================================= */
const messageSchema = new Schema<IMessage>(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
      index: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    isEdited: {
      type: Boolean,
      default: false,
    },

    attachments: {
      type: [
        {
          type: {
            type: String,
            enum: ["image", "audio"],
            required: true,
          },
          url: { type: String, required: true },
        },
      ],
      default: [],
    },

    tokens: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
    versionKey: false,
  }
);

/* =========================================================
   💬 CHAT SCHEMA (HARDENED + SCALE READY)
========================================================= */
const chatSchema = new Schema<IChat, ChatModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sessionId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    title: {
      type: String,
      default: "New Chat",
      trim: true,
      maxlength: 120,
    },

    lastMessage: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },

    messages: {
      type: [messageSchema],
      default: [],
    },

    pinned: {
      type: Boolean,
      default: false,
      index: true,
    },

    summary: {
      type: String,
      default: "",
      maxlength: 3000,
    },

    tags: {
      type: [String],
      default: [],
      index: true,
    },

    memoryVersion: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================================================
   ⚡ INDEXES (PRODUCTION OPTIMIZED)
========================================================= */

// prevent duplicate sessions
chatSchema.index({ user: 1, sessionId: 1 }, { unique: true });

// fast sidebar load
chatSchema.index({ user: 1, updatedAt: -1 });

// pinned chats priority
chatSchema.index({ user: 1, pinned: -1, updatedAt: -1 });

// search optimization (lightweight safe version)
chatSchema.index(
  { title: "text", lastMessage: "text", tags: "text" },
  {
    name: "chat_text_index",
  }
);

/* =========================================================
   🧼 CLEAN OUTPUT (API SAFE)
========================================================= */
chatSchema.set("toJSON", {
  transform: (_doc, ret: any) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

/* =========================================================
   🧠 INSTANCE METHOD (SAFE + CONSISTENT)
========================================================= */
chatSchema.methods.addMessage = function (
  role: "user" | "assistant",
  content: string
) {
  if (!content || typeof content !== "string") return;

  this.messages.push({
    role,
    content: content.trim(),
    isEdited: false,
    attachments: [],
    tokens: 0,
    createdAt: new Date(),
  });

  this.lastMessage = content.slice(0, 300);

  if (this.messages.length === 1 && role === "user") {
    this.title = content.slice(0, 40);
  }

  this.updatedAt = new Date();
};

/* =========================================================
   🚀 STATIC METHODS (HARDENED)
========================================================= */
chatSchema.statics.findOrCreateSession = async function (
  userId: Types.ObjectId,
  sessionId: string
): Promise<IChat> {
  if (!userId || !sessionId) {
    throw new Error("Invalid session parameters");
  }

  // atomic safety: prevents duplicates in race conditions
  let chat = await this.findOne({ user: userId, sessionId });

  if (!chat) {
    try {
      chat = await this.create({
        user: userId,
        sessionId,
        messages: [],
        pinned: false,
        summary: "",
        tags: [],
        memoryVersion: 1,
      });
    } catch (err: any) {
      // race condition fallback (VERY IMPORTANT)
      chat = await this.findOne({ user: userId, sessionId });

      if (!chat) {
        throw new Error("Session creation failed");
      }
    }
  }

  return chat;
};

/* =========================================================
   📂 USER SESSIONS (SAFE QUERY)
========================================================= */
chatSchema.statics.findUserSessions = function (
  userId: Types.ObjectId
) {
  return this.find({ user: userId })
    .sort({ pinned: -1, updatedAt: -1 })
    .select(
      "sessionId title lastMessage updatedAt pinned summary tags"
    )
    .lean();
};

/* =========================================================
   🚀 EXPORT SAFE MODEL (NO REDEFINITION BUG)
========================================================= */
export const Chat =
  (mongoose.models.Chat as ChatModel) ||
  mongoose.model<IChat, ChatModel>("Chat", chatSchema);