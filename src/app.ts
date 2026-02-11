import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import chatRoutes from "./routes/chat.routes.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);

app.get("/", (_req, res) => {
  res.send("Chat Server Running..!");
});
