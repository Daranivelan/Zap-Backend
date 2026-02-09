import { Socket } from "socket.io";

export const registerSocketHandler = (socket: Socket) => {
  console.log(`User ${socket.userId} Connected..!`);

  socket.on("disconnect", () => {
    console.log(`User ${socket.userId} Disconnected..!`);
  });
};
