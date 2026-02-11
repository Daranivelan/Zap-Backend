import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { getConversation } from "../services/message.service.js";

export const getChatHistory = async (req: AuthRequest, res: Response) => {
  const { otherUserId } = req.params;
  const userId = req.userId!;

  const messages = await getConversation(
    userId,
    Array.isArray(otherUserId) ? otherUserId[0] : otherUserId,
  );

  res.json(messages);
};
