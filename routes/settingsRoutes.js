// routes/settingsRoutes.js
import express from "express";
import { 
  getSettings, 
  updateSettings, 
  createBackup, 
  downloadBackup, 
  exportCasesToExcel,
  updateSiteLogo,
  getSystemStats,
} from "../controllers/settingsController.js";
import { protect, authorizeRoles } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// 🔐 جميع الروتس الأخرى تحتاج authentication
router.use(protect);

// 🛠️ الإعدادات العامة
router.get("/", getSettings);
router.put("/", authorizeRoles("admin"), updateSettings);

// 💾 النسخ الاحتياطي
router.post("/backup", authorizeRoles("admin"), createBackup);
router.get("/backup/download/:backupId", authorizeRoles("admin"), downloadBackup);

// 📊 تصدير البيانات
router.get("/export/cases", authorizeRoles("admin", "subadmin"), exportCasesToExcel);

// 🖼️ إدارة الموقع
router.patch("/logo", authorizeRoles("admin"), upload.single('logo'), updateSiteLogo);

// 📈 إحصائيات النظام
router.get("/stats", authorizeRoles("admin", "subadmin"), getSystemStats);

export default router;