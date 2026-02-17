import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { getAllUsersExcept } from "../services/user.service.js";

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (userId) {
      const users = await getAllUsersExcept(userId);
      res.json(users);
    }
  } catch {
    res.status(500).json({ message: "Error Fetching Users" });
  }
};
