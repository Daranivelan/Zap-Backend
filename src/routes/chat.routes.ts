import { Router } from "express";
import { authmiddleware } from "../middleware/auth.middleware.js";
import { getChatHistory } from "../controller/chat.controller.js";

const router = Router();

router.get("/:otherUserId", authmiddleware, getChatHistory);

export default router;
