import { Request, Response } from "express";
import { Mood } from "../models/moodModel.js";

interface AuthRequest extends Request {
  user?: any;
}

// ==============================
// ✅ SAVE MOOD
// ==============================
export const saveMood = async (req: AuthRequest, res: Response) => {
  try {
    const { mood } = req.body;

    if (!mood) {
      return res.status(400).json({
        success: false,
        message: "Mood is required",
      });
    }

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const newMood = await Mood.create({
      user: req.user._id,
      mood,
    });

    res.status(201).json({
      success: true,
      message: "Mood saved successfully",
      data: newMood,
    });
  } catch (error) {
    console.error("Mood Save Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// ✅ GET MOOD HISTORY
// ==============================
export const getMoodHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const moods = await Mood.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({
      success: true,
      data: moods,
    });
  } catch (error) {
    console.error("Mood History Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};