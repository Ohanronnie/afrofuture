import { Router } from "express";
import { uploadExcel } from "../middleware/uploadExcel.js";
import { authenticateAdmin } from "../middleware/auth.js";
import {
  createExcelBroadcast,
  getExcelBroadcasts,
  getExcelBroadcast,
} from "../controllers/excelBroadcastController.js";

const router = Router();

router.use(authenticateAdmin);

router.post("/", uploadExcel.single("file"), createExcelBroadcast);

router.get("/", getExcelBroadcasts);

router.get("/:id", getExcelBroadcast);

export default router;
