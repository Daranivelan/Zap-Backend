import { Socket } from "socket.io";
import {
  createMessage,
  getUndeliveredMessages,
  markMessagesAsDelivered,
} from "../services/message.service.js";

const onlineUsers = new Map<string, string>();

export const registerSocketHandler = (socket: Socket) => {
  const userId = socket.userId!;

  async () => {
    const pendingMessages = await getUndeliveredMessages(userId);

    if (pendingMessages.length > 0) {
      pendingMessages.forEach(
        (msg: { senderId: any; content: any; createdAt: any }) => {
          socket.emit("receive_message", {
            from: msg.senderId,
            content: msg.content,
            timestamp: msg.createdAt,
          });
        },
      );

      await markMessagesAsDelivered(
        pendingMessages.map((m: { id: any }) => m.id),
      );
    }
  };

  onlineUsers.set(userId, socket.id);
  console.log(`User ${userId} Connected..!`);

  socket.broadcast.emit("user_online", { userId });

  socket.on(
    "send_message",
    async ({ to, content }: { to: string; content: string }) => {
      console.log("🧠 Online users map:", onlineUsers);
      console.log("🎯 Looking for receiver:", to);

      const savedMessage = await createMessage(userId, to, content);

      const receiverSocketId = onlineUsers.get(to);

      console.log(`Receiver Socket ID: ${receiverSocketId}`);

      const messagePayload = {
        from: userId,
        content: savedMessage.content,
        timestamp: savedMessage.createdAt,
      };

      if (receiverSocketId) {
        socket.to(receiverSocketId).emit("receive_message", messagePayload);
        console.log(`${userId} -> ${to}: ${content}`);
      } else {
        console.log(`User ${to} is offline. Message is not Delivered`);
      }

      await markMessagesAsDelivered([savedMessage.id]);
    },
  );

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    console.log(`User ${userId} Disconnected..!`);

    socket.broadcast.emit("user_offline", { userId });
  });
};
