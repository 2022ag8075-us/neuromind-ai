import { Request, Response } from "express";
import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

/**
 * ==============================
 * ⚙️ ENV SAFETY
 * ==============================
 */
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("❌ JWT_SECRET is not defined in environment variables");
}

/**
 * ==============================
 * 🔐 TOKEN GENERATOR
 * ==============================
 */
const generateToken = (id: string) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: "1d",
  });
};

/**
 * ==============================
 * 🧠 INPUT VALIDATION
 * ==============================
 */
const validateAuthInput = (email?: string, password?: string) => {
  if (!email || !password) {
    return "Email and password are required";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return "Invalid email format";
  }

  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }

  return null;
};

/**
 * ==============================
 * 🟢 SIGNUP (PRODUCTION SAFE)
 * ==============================
 */
export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    /**
     * 🔍 VALIDATION
     */
    const error = validateAuthInput(email, password);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    /**
     * 🔍 CHECK EXISTING USER
     */
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    /**
     * 🔐 HASH PASSWORD
     */
    const hashedPassword = await bcrypt.hash(password, 12);

    /**
     * 👤 CREATE USER
     */
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    /**
     * 🔐 TOKEN
     */
    const token = generateToken(user._id.toString());

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (err: any) {
    console.error("❌ SIGNUP ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * ==============================
 * 🔵 LOGIN (PRODUCTION SAFE)
 * ==============================
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    /**
     * 🔍 VALIDATION
     */
    const error = validateAuthInput(email, password);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    /**
     * 🔍 FIND USER
     */
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    /**
     * 🔐 CHECK PASSWORD
     */
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    /**
     * 🔐 TOKEN
     */
    const token = generateToken(user._id.toString());

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (err: any) {
    console.error("❌ LOGIN ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};