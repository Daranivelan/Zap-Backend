import { prisma } from "../db/client.js";

export const getAllUsersExcept = async (userId: string) => {
  return prisma.user.findMany({
    where: {
      NOT: { id: userId },
    },
    select: {
      id: true,
      username: true,
    },
  });
};
