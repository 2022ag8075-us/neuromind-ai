import multer from "multer";
import path from "path";
import fs from "fs";

/**
 * ==============================
 * 📁 ENSURE UPLOAD DIR EXISTS
 * ==============================
 */
const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * ==============================
 * 💾 DISK STORAGE (PRODUCTION SAFE)
 * ==============================
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const uniqueSuffix =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    const ext = path.extname(file.originalname);

    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

/**
 * ==============================
 * 🛡️ FILE FILTER (SECURITY LAYER)
 * ==============================
 */
const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    // images
    "image/jpeg",
    "image/png",
    "image/webp",

    // audio
    "audio/mpeg",
    "audio/wav",
    "audio/mp3",
    "audio/ogg",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new Error("Unsupported file type. Upload image or audio only.")
    );
  }

  cb(null, true);
};

/**
 * ==============================
 * ⚙️ MULTER CONFIG (ELITE)
 * ==============================
 */
export const upload = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB (safe for audio + images)
    files: 1,
  },
});