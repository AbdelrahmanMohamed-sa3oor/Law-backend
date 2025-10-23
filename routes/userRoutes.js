import express from "express";
import { register, login } from "../controllers/userController.js";

const router = express.Router();

router.post("/register", (req, res, next) => {
  console.log("📝 Incoming Register:", req.headers);
  next();
}, register);

router.post("/login", login);

export default router;

// تسجيل الأدمن أو السب أدمين	User
// إضافة محامي جديد	الأدمن أو السب أدمين	Lawyer
// موافقة أو رفض الطلب	الأدمن	Lawyer