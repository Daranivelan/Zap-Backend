import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import userRoutes from "./routes/user.routes.js";
import groupRoutes from "./routes/group.routes.js"; // Add when ready
import { initializeSocketIO } from "./sockets/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// ROUTES
// ============================================================

app.use("/api/auth", authRoutes);
app.use("/api/messages", chatRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes); // Add when ready

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// ============================================================
// HTTP SERVER + SOCKET.IO
// ============================================================

const httpServer = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocketIO(httpServer);

// ============================================================
// START SERVER
// ============================================================

httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║     🚀 Server Started Successfully!      ║
║                                           ║
║     📡 HTTP Server: http://localhost:${PORT}  ║
║     🔌 WebSocket: ws://localhost:${PORT}      ║
║                                           ║
╚═══════════════════════════════════════════╝
  `);

  console.log("Available routes:");
  console.log("  POST   /api/auth/register");
  console.log("  POST   /api/auth/login");
  console.log("  GET    /api/users");
  console.log("  GET    /api/messages/:userId");
  console.log("  GET    /health");
  console.log("");
});

// ============================================================
// ERROR HANDLING
// ============================================================

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled Rejection:", error);
  process.exit(1);
});
