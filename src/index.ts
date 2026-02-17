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

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "https://zap-frontend-nine.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.some((allowed) => allowed === origin || allowed === "*")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle OPTIONS preflight requests
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(200);
});

// ============================================================
// ROUTES
// ============================================================

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Zap Backend API",
    status: "running",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
      },
      users: "GET /api/users",
      messages: "GET /api/messages/:userId",
      groups: "GET /api/groups",
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", chatRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);

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

export default app;
