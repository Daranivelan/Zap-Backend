import { Router } from "express";
import { authmiddleware } from "../middleware/auth.middleware.js";
import * as groupService from "../services/group.service.js";
import { getIO } from "../sockets/index.js";

const router = Router();

router.post("/", authmiddleware, async (req: any, res) => {
  try {
    const { name, description, memberIds } = req.body;
    const group = await groupService.createGroup(
      req.userId,
      name,
      description,
      memberIds,
    );
    res.status(201).json(group);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", authmiddleware, async (req: any, res) => {
  try {
    const groups = await groupService.getUserGroups(req.userId);
    res.json(groups);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:groupId", authmiddleware, async (req: any, res) => {
  try {
    const group = await groupService.getGroupById(
      req.params.groupId,
      req.userId,
    );
    res.json(group);
  } catch (error: any) {
    res.status(403).json({ message: error.message });
  }
});

router.get("/:groupId/messages", authmiddleware, async (req: any, res) => {
  try {
    const { cursor, limit } = req.query;
    const messages = await groupService.getGroupMessages(
      req.params.groupId,
      req.userId,
      limit ? parseInt(limit as string) : 50,
      cursor as string,
    );
    res.json(messages);
  } catch (error: any) {
    res.status(403).json({ message: error.message });
  }
});

router.post("/:groupId/members", authmiddleware, async (req: any, res) => {
  try {
    const { memberIds } = req.body;
    await groupService.addGroupMembers(
      req.params.groupId,
      req.userId,
      memberIds,
    );

    // Create system messages for each added member
    const adminUsername = await groupService.getUsernameById(req.userId);
    for (const memberId of memberIds) {
      const memberUsername = await groupService.getUsernameById(memberId);
      const sysMsg = await groupService.createSystemMessage(
        req.params.groupId,
        req.userId,
        `${adminUsername} added ${memberUsername} to the group`,
      );

      const io = getIO();
      if (io) {
        io.to(`group:${req.params.groupId}`).emit("receive_group_message", {
          id: sysMsg.id,
          groupId: sysMsg.groupId,
          senderId: sysMsg.senderId,
          senderUsername: sysMsg.sender.username,
          content: sysMsg.content,
          isSystem: true,
          createdAt: sysMsg.createdAt,
          sender: sysMsg.sender,
        });
      }
    }

    res.json({ message: "Members added successfully" });
  } catch (error: any) {
    res.status(403).json({ message: error.message });
  }
});

router.delete(
  "/:groupId/members/:memberId",
  authmiddleware,
  async (req: any, res) => {
    try {
      const memberUsername = await groupService.getUsernameById(
        req.params.memberId,
      );
      await groupService.removeGroupMember(
        req.params.groupId,
        req.userId,
        req.params.memberId,
      );

      // Create system message for removed member
      const adminUsername = await groupService.getUsernameById(req.userId);
      const sysMsg = await groupService.createSystemMessage(
        req.params.groupId,
        req.userId,
        `${adminUsername} removed ${memberUsername} from the group`,
      );

      const io = getIO();
      if (io) {
        io.to(`group:${req.params.groupId}`).emit("receive_group_message", {
          id: sysMsg.id,
          groupId: sysMsg.groupId,
          senderId: sysMsg.senderId,
          senderUsername: sysMsg.sender.username,
          content: sysMsg.content,
          isSystem: true,
          createdAt: sysMsg.createdAt,
          sender: sysMsg.sender,
        });
      }

      res.json({ message: "Member removed successfully" });
    } catch (error: any) {
      res.status(403).json({ message: error.message });
    }
  },
);

router.post("/:groupId/leave", authmiddleware, async (req: any, res) => {
  try {
    await groupService.leaveGroup(req.params.groupId, req.userId);
    res.json({ message: "Left group successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
