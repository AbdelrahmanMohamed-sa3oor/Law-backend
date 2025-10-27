import express from "express";
import { registerLawyer, loginLawyer, getAllLawyers, getLawyerById, updateLawyer, deleteLawyer, toggleUserStatus, updateLawyerImage, searchLawyers } from "../controllers/lawyerController.js";
import { protect, authorizeRoles } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// 🟢 تسجيل الدخول - مفتوح للجميع
router.post("/login", loginLawyer);

// 🔐 جميع الروتس التالية تحتاج authentication
router.use(protect);

// 🟢 إنشاء محامي/أدمن جديد - للإدمن فقط
router.post("/register", 
  authorizeRoles("admin"), 
  upload.single('image'),
  // ⬅️ أضف middleware للتحقق
  (req, res, next) => {
    console.log("🔍 Upload Check Middleware:");
    console.log("📦 Request body keys:", Object.keys(req.body));
    console.log("📁 Request file:", req.file);
    console.log("📁 Request files:", req.files);
    
    if (req.file) {
      console.log("✅ File received:", {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      });
    } else {
      console.log("❌ No file received - checking why...");
      console.log("🔍 Request headers:", req.headers['content-type']);
    }
    
    next();
  },
  registerLawyer
);

// 🟢 تحديث صورة المستخدم
router.patch("/:id/image", 
  upload.single('image'), 
  updateLawyerImage
);

// 🟢 جلب جميع المستخدمين - مع الفلترة حسب الصلاحية
router.get("/", getAllLawyers);

// 🟢 جلب مستخدم واحد
router.get("/:id", getLawyerById);

// 🟢 تعديل بيانات مستخدم
router.put("/:id", updateLawyer);

// 🔍 روت البحث الأساسي
router.get('/search', searchLawyers);
// 🟢 حذف مستخدم - للإدمن والسب إدمن
router.delete("/:id", authorizeRoles("admin", "subadmin","secretary"), deleteLawyer);

// 🟢 تفعيل/تعطيل مستخدم - للإدمن والسب إدمن
router.patch("/:id/toggle-status", authorizeRoles("admin", "subadmin","secretary"), toggleUserStatus);

// 🟢 جلب بيانات المستخدم الحالي
router.get("/profile/me", (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});
export default router;
