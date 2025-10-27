// routes/settingsRoutes.js
import express from "express";
import { 
  getSettings, 
  updateSettings, 
  createBackup, 
  getSystemStats,
  createFullBackup,    
  restoreBackup,       
  getBackupInfo        
} from "../controllers/settingsController.js";
import { protect, authorizeRoles } from "../middlewares/authMiddleware.js";
import { backupUpload, validateFile } from "../middlewares/backupUpload.js";

const router = express.Router();

router.use(protect);

router.get("/", getSettings);
router.put("/", authorizeRoles("admin"), updateSettings);
router.post("/backup", authorizeRoles("admin","subadmin"), createBackup);
router.get("/backup/full", authorizeRoles("admin","subadmin"), createFullBackup);
router.post("/backup/restore", authorizeRoles("admin","subadmin"), backupUpload.single('backupFile'), validateFile, restoreBackup);
router.get("/backup/info", authorizeRoles("admin","subadmin"), getBackupInfo);
router.get("/stats", authorizeRoles("admin", "subadmin"), getSystemStats);

export default router;