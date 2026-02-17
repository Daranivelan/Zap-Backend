import { PrismaClient } from "../generated/prisma/client.js";
import "dotenv/config";

export const prisma = new PrismaClient();
