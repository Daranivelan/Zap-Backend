import { Socket } from "socket.io";
import { verifyToken } from "../utils/jwt.js";

export const socketAuth = (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];
    if (!token) {
      throw new Error("No Token");
    }

    const payload = verifyToken(token);
    socket.userId = payload.userId;

    next();
  } catch {
    next(new Error("Unauthorized"));
  }
};
