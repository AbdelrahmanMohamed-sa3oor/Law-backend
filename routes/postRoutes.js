import express from "express";
import { createPost, deletePost, getLawyers, getPosts, getUserPosts } from "../controllers/postController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";



const router = express.Router();

// 🟢 إنشاء بوست (للأدمن فقط)
router.post(
  "/",
  protect,
  upload.single("image"),
  createPost
);

// 🟡 عرض كل البوستات
router.get("/admin", protect, getPosts);
router.get('/lawyers', protect, getLawyers); 
router.get('/getUserPosts', getUserPosts);
router.delete("/:id", protect, deletePost); 
export default router;
