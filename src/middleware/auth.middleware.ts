import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";

export interface AuthRequest extends Request {
  userId?: string;
}

export const authmiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const header = req.headers.authorization;
    if (!header) {
      return res.status(401).json({ message: "No token" });
    }

    const token = header.split(" ")[1];
    const payload = verifyToken(token);

    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized..!" });
  }
};
