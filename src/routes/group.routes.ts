import { Router } from "express";
import { authmiddleware } from "../middleware/auth.middleware.js";
import * as groupService from "../services/group.service.js";

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
      await groupService.removeGroupMember(
        req.params.groupId,
        req.userId,
        req.params.memberId,
      );
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
