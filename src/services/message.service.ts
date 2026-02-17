import { prisma } from "../db/client.js";

export const createMessage = async (
  senderId: string,
  receiverId: string,
  content: string,
) => {
  return prisma.message.create({
    data: {
      senderId,
      receiverId,
      content,
    },
  });
};

export const getUndeliveredMessages = async (userId: string) => {
  return prisma.message.findMany({
    where: {
      receiverId: userId,
      delivered: false,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

export const markMessagesAsDelivered = async (ids: string[]) => {
  return prisma.message.updateMany({
    where: { id: { in: ids } },
    data: { delivered: true },
  });
};

export const markMessageAsSeen = async (
  senderId: string,
  receiverId: string,
) => {
  return prisma.message.updateMany({
    where: {
      senderId,
      receiverId,
      seen: false,
    },
    data: {
      seen: true,
      delivered: true,
    },
  });
};

export const getConversation = async (userId: string, otherUserId: string) => {
  return prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};
