import dotenv from "dotenv";

dotenv.config();

console.log("✅ ENV LOADED:", process.env.GROQ_API_KEY ? "YES" : "NO");