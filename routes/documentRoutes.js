import express from "express";
import {createDocument, getDocument} from "../controllers/documentController.js"
import { upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.post("/", upload.single("file"), createDocument);
router.get("/", getDocument);

export default router;
