import express from "express";
import {
  createCase,
  getCaseById,
  updateCase,
  deleteCase,
  getPendingCases,
  approveOrRejectCase,
  searchCases,
  getCaseStats,
  getTomorrowCases,
  getCasesPage
} from "../controllers/caseController.js";

import { protect, authorizeRoles } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get("/upcoming-tomorrow", getTomorrowCases);
router.get("/stats", protect, authorizeRoles("admin"), getCaseStats);

// 🟢 إنشاء قضية جديدة مع الصور
router.post(
  "/",
  protect,
  authorizeRoles("admin", "subadmin"),
  upload.array("attachments", 5), // استقبال حتى 5 صور
  createCase
);
// جلب القضايا بالصفحات 
router.get("/pages", protect, getCasesPage);
router.get("/search/all", protect, searchCases);


// 🟢 جلب قضية محددة
router.get("/:id", protect, getCaseById);

// 🟢 تحديث قضية
router.put("/:id", protect, authorizeRoles("admin", "subadmin"), upload.array('attachments'), updateCase);

// 🟢 حذف قضية
router.delete("/:id", protect, authorizeRoles("admin"), deleteCase);

// 🟢 القضايا المعلقة
router.get("/admin/pending", protect, authorizeRoles("admin"), getPendingCases);

// 🟢 موافقة/رفض قضية
router.patch("/:id/approval", protect, authorizeRoles("admin"), approveOrRejectCase);


export default router;