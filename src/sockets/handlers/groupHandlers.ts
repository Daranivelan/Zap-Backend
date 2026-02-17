import { Server, Socket } from "socket.io";
import * as groupService from "../../services/group.service.js";

const groupRooms = new Map<string, Set<string>>();

export const setupGroupHandlers = (
  io: Server,
  socket: Socket,
  connectedUsers: Map<string, string>,
) => {
  const userId = socket.data.userId;
  const username = socket.data.username;

  socket.on("join_groups", async () => {
    try {
      const groups = await groupService.getUserGroups(userId);

      groups.forEach((group) => {
        const roomName = `group:${group.id}`;
        socket.join(roomName);

        if (!groupRooms.has(group.id)) {
          groupRooms.set(group.id, new Set());
        }
        groupRooms.get(group.id)!.add(socket.id);
      });

      socket.emit("groups_joined", {
        groupIds: groups.map((g) => g.id),
        count: groups.length,
      });

      console.log(`User ${userId} joined ${groups.length} group rooms`);
    } catch (error) {
      socket.emit("error", { message: "Failed to join groups" });
    }
  });

  socket.on("send_group_message", async ({ groupId, content }) => {
    const userId = socket.data.userId;

    try {
      if (!groupId || !content || content.trim() === "") {
        socket.emit("error", { message: "Invalid message data" });
        return;
      }

      if (content.length > 5000) {
        socket.emit("error", {
          message: "Message too long (max 5000 characters)",
        });
        return;
      }

      const message = await groupService.sendGroupMessage(
        groupId,
        userId,
        content,
      );

      const messagePayload = {
        id: message.id,
        groupId,
        senderId: userId,
        senderUsername: username,
        content: message.content,
        createdAt: message.createdAt,
        sender: message.sender,
      };

      io.to(`group:${groupId}`).emit("receive_group_message", messagePayload);

      console.log(`Message sent to group ${groupId} by ${userId}`);
    } catch (error: any) {
      if (error.message === "You are not a member of this group") {
        socket.emit("error", { message: "You are not a member of this group" });
      } else {
        socket.emit("error", { message: "Failed to send message" });
      }
    }
  });

  socket.on("group_typing", ({ groupId }: { groupId: string }) => {
    if (!groupId) return;

    socket.to(`group:${groupId}`).emit("group_user_typing", {
      groupId,
      userId,
      username,
    });
  });

  socket.on("group_stop_typing", ({ groupId }: { groupId: string }) => {
    if (!groupId) return;

    socket.to(`group:${groupId}`).emit("group_user_stop_typing", {
      groupId,
      userId,
    });
  });

  socket.on(
    "member_added",
    async ({ groupId, memberId }: { groupId: string; memberId: string }) => {
      try {
        if (!groupId || !memberId) {
          socket.emit("error", { message: "Invalid data" });
          return;
        }

        await groupService.addGroupMembers(groupId, userId, [memberId]);

        io.to(`group:${groupId}`).emit("group_member_added", {
          groupId,
          memberId,
          addedBy: userId,
          addedByUsername: username,
        });

        const memberSocketId = connectedUsers.get(memberId);
        if (memberSocketId) {
          const memberSocket = io.sockets.sockets.get(memberSocketId);

          if (memberSocket) {
            memberSocket.join(`group:${groupId}`);

            if (!groupRooms.has(groupId)) {
              groupRooms.set(groupId, new Set());
            }
            groupRooms.get(groupId)!.add(memberSocketId);

            memberSocket.emit("added_to_group", { groupId });
          }
        }
      } catch (error: any) {
        if (error.message === "Only admins can add members") {
          socket.emit("error", { message: "Only admins can add members" });
        } else {
          socket.emit("error", { message: "Failed to add member" });
        }
      }
    },
  );

  socket.on(
    "member_removed",
    async ({ groupId, memberId }: { groupId: string; memberId: string }) => {
      try {
        if (!groupId || !memberId) {
          socket.emit("error", { message: "Invalid data" });
          return;
        }

        await groupService.removeGroupMember(groupId, userId, memberId);

        io.to(`group:${groupId}`).emit("group_member_removed", {
          groupId,
          memberId,
          removedBy: userId,
          removedByUsername: username,
        });

        const memberSocketId = connectedUsers.get(memberId);
        if (memberSocketId) {
          const memberSocket = io.sockets.sockets.get(memberSocketId);

          if (memberSocket) {
            memberSocket.leave(`group:${groupId}`);

            const sockets = groupRooms.get(groupId);
            if (sockets) {
              sockets.delete(memberSocketId);
            }

            memberSocket.emit("removed_from_group", {
              groupId,
              removedBy: userId,
              removedByUsername: username,
            });
          }
        }
      } catch (error: any) {
        if (
          error.message === "Only admins can remove members" ||
          error.message === "Use leave group to remove yourself"
        ) {
          socket.emit("error", { message: error.message });
        } else {
          socket.emit("error", { message: "Failed to remove member" });
        }
      }
    },
  );

  socket.on("leave_group", async ({ groupId }: { groupId: string }) => {
    try {
      if (!groupId) {
        socket.emit("error", { message: "Group ID is required" });
        return;
      }

      await groupService.leaveGroup(groupId, userId);

      socket.leave(`group:${groupId}`);

      const sockets = groupRooms.get(groupId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          groupRooms.delete(groupId);
        }
      }

      io.to(`group:${groupId}`).emit("member_left_group", {
        groupId,
        userId,
        username,
      });

      socket.emit("left_group_success", { groupId });
    } catch (error: any) {
      if (error.message === "You are not a member of this group") {
        socket.emit("error", { message: "You are not a member of this group" });
      } else {
        socket.emit("error", { message: "Failed to leave group" });
      }
    }
  });

  socket.on("get_group_details", async ({ groupId }: { groupId: string }) => {
    try {
      if (!groupId) {
        socket.emit("error", { message: "Group ID is required" });
        return;
      }

      const group = await groupService.getGroupById(groupId, userId);

      socket.emit("group_details", group);
    } catch (error: any) {
      if (error.message === "You are not a member of this group") {
        socket.emit("error", { message: "You are not a member of this group" });
      } else {
        socket.emit("error", { message: "Failed to fetch group details" });
      }
    }
  });

  return () => {
    console.log(`🔌 Cleaning up group handlers for ${username} (${userId})`);

    let removedFromCount = 0;
    groupRooms.forEach((sockets, groupId) => {
      const hadSocket = sockets.delete(socket.id);
      if (hadSocket) {
        removedFromCount++;
      }

      if (sockets.size === 0) {
        groupRooms.delete(groupId);
      }
    });

    if (removedFromCount > 0) {
      console.log(`✓ Removed ${username} from ${removedFromCount} group rooms`);
    }
  };
};
