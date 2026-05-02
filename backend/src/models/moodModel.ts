import mongoose, { Document, Schema } from "mongoose";

export interface IMood extends Document {
  user: mongoose.Types.ObjectId;
  mood: "happy" | "sad" | "angry" | "anxious" | "neutral";
  note?: string;
  createdAt: Date;
}

const moodSchema = new Schema<IMood>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mood: {
      type: String,
      enum: ["happy", "sad", "angry", "anxious", "neutral"],
      required: true,
    },
    note: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Mood = mongoose.model<IMood>("Mood", moodSchema);