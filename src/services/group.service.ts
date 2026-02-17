import { prisma } from "../db/client.js";

export const createGroup = async (
  creatorId: string,
  name: string,
  description?: string,
  memberIds: string[] = [],
) => {
  return prisma.$transaction(async (tx) => {
    const group = await tx.group.create({
      data: {
        name,
        description,
        creatorId,
      },
    });

    await tx.groupMember.create({
      data: {
        groupId: group.id,
        userId: creatorId,
        role: "admin",
      },
    });

    if (memberIds.length > 0) {
      await tx.groupMember.createMany({
        data: memberIds.map((userId) => ({
          groupId: group.id,
          userId,
          role: "member",
        })),
      });
    }

    return group;
  });
};

export const getUserGroups = async (userId: string) => {
  return prisma.group.findMany({
    where: {
      members: {
        some: { userId },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
};

export const getGroupById = async (groupId: string, requesterId: string) => {
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: requesterId,
      },
    },
  });

  if (!membership) {
    throw new Error("You are not a member of this group");
  }

  return prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      },
      creator: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });
};

export const addGroupMembers = async (
  groupId: string,
  adminId: string,
  memberIds: string[],
) => {
  const adminMembership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: adminId,
      },
    },
  });

  if (!adminMembership || adminMembership.role !== "admin") {
    throw new Error("Only admins can add members");
  }

  return prisma.groupMember.createMany({
    data: memberIds.map((userId) => ({
      groupId,
      userId,
      role: "member",
    })),
    skipDuplicates: true,
  });
};

export const removeGroupMember = async (
  groupId: string,
  adminId: string,
  memberIdToRemove: string,
) => {
  const adminMembership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: adminId,
      },
    },
  });

  if (!adminMembership || adminMembership.role !== "admin") {
    throw new Error("Only admins can remove members");
  }

  if (adminId === memberIdToRemove) {
    throw new Error("Use leave group to remove yourself");
  }

  return prisma.groupMember.delete({
    where: {
      groupId_userId: {
        groupId,
        userId: memberIdToRemove,
      },
    },
  });
};

export const leaveGroup = async (groupId: string, userId: string) => {
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
  });

  if (!membership) {
    throw new Error("You are not a member of this group");
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        where: {
          role: "admin",
        },
      },
    },
  });

  if (membership.role === "admin") {
    const adminCount =
      group?.members.filter((m) => m.role === "admin").length || 0;

    if (adminCount === 1) {
      const totalMembers = await prisma.groupMember.count({
        where: { groupId },
      });

      if (totalMembers > 1) {
        const nextAdmin = await prisma.groupMember.findFirst({
          where: {
            groupId,
            userId: { not: userId },
          },
          orderBy: { joinedAt: "asc" },
        });

        if (nextAdmin) {
          await prisma.groupMember.update({
            where: { id: nextAdmin.id },
            data: { role: "admin" },
          });
        }
      }
    }
  }

  return prisma.groupMember.delete({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
  });
};

export const getGroupMessages = async (
  groupId: string,
  userId: string,
  limit: number = 50,
  cursor?: string,
) => {
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
  });

  if (!membership) {
    throw new Error("Not a member of this group");
  }

  return prisma.groupMessage.findMany({
    where: {
      groupId,
      createdAt: {
        gte: membership.joinedAt,
      },
    },
    take: limit,
    ...(cursor && {
      skip: 1,
      cursor: { id: cursor },
    }),
    include: {
      sender: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const sendGroupMessage = async (
  groupId: string,
  senderId: string,
  content: string,
) => {
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: senderId,
      },
    },
  });

  if (!membership) {
    throw new Error("You are not a member of this group");
  }

  return prisma.$transaction(async (tx) => {
    const message = await tx.groupMessage.create({
      data: {
        groupId,
        senderId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    await tx.group.update({
      where: { id: groupId },
      data: { updatedAt: new Date() },
    });

    return message;
  });
};
