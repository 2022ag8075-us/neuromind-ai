import express from "express";
import { saveMood, getMoodHistory } from "../controllers/moodController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Save mood
router.post("/", protect, saveMood);

// Get mood history
router.get("/", protect, getMoodHistory);

export default router;