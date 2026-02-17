import { Server, Socket } from "socket.io";
import {
  createMessage,
  getUndeliveredMessages,
  markMessageAsSeen,
  markMessagesAsDelivered,
} from "../../services/message.service.js";

/**
 * Sets up all socket handlers for 1-on-1 chat functionality
 *
 * @param io - Socket.IO server instance
 * @param socket - Individual socket connection
 * @param connectedUsers - Map tracking userId -> socketId for online users
 * @param activeChats - Map tracking userId -> current chat partner userId
 * @returns Cleanup function to be called on disconnect
 */
export const setupChatHandlers = (
  io: Server,
  socket: Socket,
  connectedUsers: Map<string, string>,
  activeChats: Map<string, string>,
) => {
  const userId = socket.data.userId;
  const username = socket.data.username;

  console.log(`Setting up chat handlers for user: ${username} (${userId})`);

  // ============================================================
  // INITIAL CONNECTION - Send pending messages
  // ============================================================
  (async () => {
    try {
      // Fetch all undelivered messages for this user
      const pendingMessages = await getUndeliveredMessages(userId);

      if (pendingMessages.length > 0) {
        console.log(
          `Sending ${pendingMessages.length} pending messages to ${username}`,
        );

        // Send each pending message to the user
        pendingMessages.forEach((msg: any) => {
          socket.emit("receive_message", {
            id: msg.id,
            senderId: msg.senderId,
            receiverId: userId,
            content: msg.content,
            createdAt: msg.createdAt,
            delivered: true,
            seen: msg.seen,
          });
        });

        // Mark all these messages as delivered in the database
        const messageIds = pendingMessages.map((m) => m.id);
        await markMessagesAsDelivered(messageIds);

        // Notify senders that their messages were delivered
        messageIds.forEach((msgId) => {
          const msg = pendingMessages.find((m) => m.id === msgId);
          if (msg) {
            const senderSocketId = connectedUsers.get(msg.senderId);
            if (senderSocketId) {
              io.to(senderSocketId).emit("message_delivered", {
                messageId: msgId,
                to: userId,
              });
            }
          }
        });
      }
    } catch (error) {
      console.error(`Error fetching pending messages for ${username}:`, error);
    }
  })();

  // ============================================================
  // USER ONLINE STATUS
  // ============================================================

  // Add user to connected users map
  connectedUsers.set(userId, socket.id);
  console.log(`User ${username} (${userId}) is now online`);
  console.log(`Total connected users: ${connectedUsers.size}`);

  // Broadcast to all clients that this user is online
  io.emit("user_online", {
    userId,
    username,
  });

  // Send the list of currently online users to the newly connected user
  const onlineUserIds = Array.from(connectedUsers.keys());
  socket.emit("online_users_list", onlineUserIds);

  // ============================================================
  // SEND MESSAGE HANDLER
  // ============================================================
  socket.on(
    "send_message",
    async ({ to, content }: { to: string; content: string }) => {
      try {
        console.log(
          `📨 Message from ${username} to ${to}: "${content.substring(0, 50)}..."`,
        );

        // Validate input
        if (!to || !content || content.trim() === "") {
          socket.emit("error", { message: "Invalid message data" });
          return;
        }

        // Save message to database
        const savedMessage = await createMessage(userId, to, content);

        // Get receiver's socket ID
        const receiverSocketId = connectedUsers.get(to);
        console.log(
          `Receiver ${to} socket ID: ${receiverSocketId || "offline"}`,
        );

        // Prepare message payload
        const messagePayload = {
          id: savedMessage.id,
          senderId: userId,
          senderUsername: username,
          receiverId: to,
          content: savedMessage.content,
          createdAt: savedMessage.createdAt,
          delivered: false,
          seen: false,
        };

        // If receiver is online
        if (receiverSocketId) {
          // Check if receiver is actively viewing this chat
          const receiverActiveChat = activeChats.get(to);
          const isReceiverViewingChat = receiverActiveChat === userId;

          if (isReceiverViewingChat) {
            // Receiver is viewing the chat - mark as seen immediately
            console.log(`✓ Message auto-seen by ${to} (active chat)`);

            await markMessageAsSeen(userId, to);
            messagePayload.seen = true;
            messagePayload.delivered = true;

            // Notify sender that message was seen
            socket.emit("messages_seen", {
              by: to,
              chatWith: userId,
            });
          } else {
            // Receiver is online but not viewing this chat - just mark as delivered
            console.log(`✓ Message delivered to ${to}`);
            messagePayload.delivered = true;

            // Update delivery status in database
            await markMessagesAsDelivered([savedMessage.id]);
          }

          // Send message to receiver
          io.to(receiverSocketId).emit("receive_message", messagePayload);
        } else {
          // Receiver is offline
          console.log(
            `✗ User ${to} is offline. Message saved for later delivery.`,
          );
        }

        // Always send message back to sender with appropriate status
        socket.emit("receive_message", messagePayload);
      } catch (error) {
        console.error("Error in send_message handler:", error);
        socket.emit("error", {
          message: "Failed to send message",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // ============================================================
  // TYPING INDICATORS
  // ============================================================

  socket.on("typing", ({ to }: { to: string }) => {
    const receiverSocketId = connectedUsers.get(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("user_typing", {
        userId,
        username,
      });
      console.log(`${username} is typing to ${to}`);
    }
  });

  socket.on("stop_typing", ({ to }: { to: string }) => {
    const receiverSocketId = connectedUsers.get(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("user_stop_typing", {
        userId,
      });
      console.log(`${username} stopped typing to ${to}`);
    }
  });

  // ============================================================
  // MARK MESSAGES AS SEEN
  // ============================================================

  socket.on("mark_seen", async ({ withUser }: { withUser: string }) => {
    try {
      console.log(`Marking messages from ${withUser} as seen by ${username}`);

      // Mark all messages from withUser to current user as seen
      await markMessageAsSeen(withUser, userId);

      // Notify the sender that their messages were seen
      const senderSocketId = connectedUsers.get(withUser);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messages_seen", {
          by: userId,
          byUsername: username,
          chatWith: withUser,
        });
        console.log(
          `✓ Notified ${withUser} that ${username} saw their messages`,
        );
      }
    } catch (error) {
      console.error("Error in mark_seen handler:", error);
      socket.emit("error", { message: "Failed to mark messages as seen" });
    }
  });

  // ============================================================
  // ACTIVE CHAT TRACKING
  // ============================================================

  socket.on("active_chat", ({ chatWith }: { chatWith?: string }) => {
    if (chatWith) {
      // User opened a chat
      activeChats.set(userId, chatWith);
      console.log(`👁️  ${username} is now viewing chat with ${chatWith}`);

      // Auto-mark messages as seen when opening chat
      markMessageAsSeen(chatWith, userId)
        .then(() => {
          const senderSocketId = connectedUsers.get(chatWith);
          if (senderSocketId) {
            io.to(senderSocketId).emit("messages_seen", {
              by: userId,
              byUsername: username,
              chatWith,
            });
          }
        })
        .catch((error) => {
          console.error("Error auto-marking messages as seen:", error);
        });
    } else {
      // User closed/left the chat
      activeChats.delete(userId);
      console.log(`👁️  ${username} closed active chat`);
    }
  });

  // ============================================================
  // MESSAGE DELIVERED ACKNOWLEDGMENT
  // ============================================================

  socket.on(
    "message_delivered",
    async ({ messageId, from }: { messageId: string; from: string }) => {
      try {
        console.log(`✓ Message ${messageId} delivered to ${username}`);

        // Mark the message as delivered in the database
        await markMessagesAsDelivered([messageId]);

        // Notify the sender that their message was delivered
        const senderSocketId = connectedUsers.get(from);
        if (senderSocketId) {
          io.to(senderSocketId).emit("message_delivered", {
            messageId,
            to: userId,
          });
        }
      } catch (error) {
        console.error("Error in message_delivered handler:", error);
      }
    },
  );

  // ============================================================
  // REQUEST ONLINE USERS
  // ============================================================

  socket.on("get_online_users", () => {
    const onlineUserIds = Array.from(connectedUsers.keys());
    socket.emit("online_users_list", onlineUserIds);
    console.log(
      `Sent online users list to ${username}: ${onlineUserIds.length} users`,
    );
  });

  // ============================================================
  // CLEANUP FUNCTION (called on disconnect)
  // ============================================================

  return () => {
    console.log(`🔌 Cleaning up chat handlers for ${username} (${userId})`);

    // Remove from connected users
    const wasConnected = connectedUsers.delete(userId);
    if (wasConnected) {
      console.log(`✓ Removed ${username} from connected users`);
    }

    // Remove from active chats
    const hadActiveChat = activeChats.delete(userId);
    if (hadActiveChat) {
      console.log(`✓ Removed ${username} from active chats`);
    }

    // Broadcast to all clients that this user is offline
    io.emit("user_offline", {
      userId,
      username,
    });

    console.log(`Total connected users remaining: ${connectedUsers.size}`);
  };
};
