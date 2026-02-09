import { Server } from "socket.io";
import { socketAuth } from "./middleware.js";
import { registerSocketHandler } from "./handlers.js";

export const initSockets = (io: Server) => {
  io.use(socketAuth);

  io.on("connection", (socket) => {
    registerSocketHandler(socket);
  });
};
