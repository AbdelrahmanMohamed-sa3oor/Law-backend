import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import caseRoutes from "./routes/caseRoutes.js";
import lawyerRoutes from "./routes/lawyerRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import opponentRoutes from "./routes/opponentRoutes.js";

const app = express();

// ✅ استخدم PORT من البيئة أو أي قيمة احتياطية (Vercel بيديها تلقائي)
// const PORT = process.env.PORT || 4300;

// Middleware
app.use(cors({
  origin: [
    'https://office-youssef-saoor.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept'
  ]
}));
app.use(express.json({ limit: "10mb" }));

// Test route
app.get("/", (req, res) => {
  res.send("✅ API is working on Vercel");
});

// Routes
app.use("/api/users", userRoutes);
app.use("/api/lawyers", lawyerRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/document", documentRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/opponents", opponentRoutes);

// DB connection
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    maxPoolSize: 15,
    minPoolSize: 5,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ DB Error:", err));

console.log("☁️ Cloudinary config:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET ? "✔️ Loaded" : "❌ Not loaded",
});

// ✅ هذا السطر ضروري لـ Vercel
export default app;

