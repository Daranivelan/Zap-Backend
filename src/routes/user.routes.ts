import { Router } from "express";
import { authmiddleware } from "../middleware/auth.middleware.js";
import { getUsers } from "../controller/user.controller.js";

const router = Router();

router.get("/", authmiddleware, getUsers);

export default router;
