import { Server } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { setupChatHandlers } from "./handlers/chatHandlers.js";
import { setupGroupHandlers } from "./handlers/groupHandlers.js"; // Uncomment when ready

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// ============================================================
// SHARED STATE - Accessible across all socket handlers
// ============================================================

/**
 * Map of connected users
 * Key: userId (string)
 * Value: socketId (string)
 * Purpose: Track who's online and their socket IDs for direct messaging
 */
const connectedUsers = new Map<string, string>();

/**
 * Map of active chats
 * Key: userId (string)
 * Value: otherUserId (string) - who they're currently chatting with
 * Purpose: Determine if messages should be auto-marked as seen
 */
const activeChats = new Map<string, string>();

// ============================================================
// SOCKET.IO SERVER SETUP
// ============================================================

/**
 * Initialize and configure Socket.IO server
 *
 * @param httpServer - HTTP server instance to attach Socket.IO to
 * @returns Configured Socket.IO server instance
 */
let ioInstance: Server | null = null;

/**
 * Get the Socket.IO server instance
 * @returns Socket.IO server instance (or null if not initialized)
 */
export const getIO = (): Server | null => ioInstance;

export const initializeSocketIO = (httpServer: HTTPServer): Server => {
  const allowedOrigins = [
    "http://localhost:3000",
    "https://zap-frontend-nine.vercel.app",
    process.env.FRONTEND_URL,
  ].filter((origin): origin is string => Boolean(origin));

  ioInstance = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Connection settings
    pingTimeout: 60000, // How long to wait for pong before considering connection dead
    pingInterval: 25000, // How often to send ping packets
    // Enable compression for better performance
    perMessageDeflate: {
      threshold: 1024, // Compress messages larger than 1KB
    },
  });

  const io = ioInstance;

  console.log("✅ Socket.IO server initialized");

  // Setup all socket handlers
  setupSocketHandlers(io);

  return io;
};

// ============================================================
// MAIN SOCKET CONNECTION HANDLER
// ============================================================

/**
 * Setup all socket event handlers
 * This is called once when the Socket.IO server is initialized
 *
 * @param io - Socket.IO server instance
 */
export const setupSocketHandlers = (io: Server) => {
  io.on("connection", (socket) => {
    console.log(`\n🔌 New connection attempt: ${socket.id}`);

    // ============================================================
    // AUTHENTICATION
    // ============================================================

    const token = socket.handshake.auth.token;

    // Check if token exists
    if (!token) {
      console.log("❌ No token provided, disconnecting socket:", socket.id);
      socket.emit("error", { message: "Authentication required" });
      socket.disconnect();
      return;
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        username: string;
        iat?: number;
        exp?: number;
      };

      // Store user data in socket for easy access in handlers
      socket.data.userId = decoded.userId;
      socket.data.username = decoded.username;

      console.log(
        `✅ User authenticated: ${decoded.username} (ID: ${decoded.userId})`,
      );
      console.log(`   Socket ID: ${socket.id}`);

      // ============================================================
      // SETUP HANDLERS FOR DIFFERENT FEATURES
      // ============================================================

      // Setup 1-on-1 chat handlers
      const cleanupChat = setupChatHandlers(
        io,
        socket,
        connectedUsers,
        activeChats,
      );

      // Setup group chat handlers (uncomment when ready)
      const cleanupGroup = setupGroupHandlers(io, socket, connectedUsers);

      // ============================================================
      // DISCONNECT HANDLER
      // ============================================================

      socket.on("disconnect", (reason) => {
        const userId = socket.data.userId;
        const username = socket.data.username;

        console.log(`\n🔌 User disconnected: ${username} (${userId})`);
        console.log(`   Reason: ${reason}`);
        console.log(`   Socket ID: ${socket.id}`);

        // Run cleanup functions from all handlers
        cleanupChat();
        cleanupGroup(); // Uncomment when ready

        console.log(`   Cleanup completed for ${username}\n`);
      });

      // ============================================================
      // ERROR HANDLER
      // ============================================================

      socket.on("error", (error) => {
        console.error(`❌ Socket error for ${socket.data.username}:`, error);
      });
    } catch (error) {
      // JWT verification failed
      console.error("❌ Authentication failed:", error);

      if (error instanceof jwt.JsonWebTokenError) {
        socket.emit("error", { message: "Invalid token" });
      } else if (error instanceof jwt.TokenExpiredError) {
        socket.emit("error", { message: "Token expired" });
      } else {
        socket.emit("error", { message: "Authentication error" });
      }

      socket.disconnect();
    }
  });

  // ============================================================
  // GLOBAL ERROR HANDLER
  // ============================================================

  io.engine.on("connection_error", (err) => {
    console.error("Connection error:", err);
  });

  console.log("✅ Socket handlers configured and listening for connections\n");
};

// ============================================================
// UTILITY FUNCTIONS (Optional - for external use)
// ============================================================

/**
 * Get all connected users
 * @returns Array of connected user IDs
 */
export const getConnectedUsers = (): string[] => {
  return Array.from(connectedUsers.keys());
};

/**
 * Check if a user is online
 * @param userId - User ID to check
 * @returns true if user is connected, false otherwise
 */
export const isUserOnline = (userId: string): boolean => {
  return connectedUsers.has(userId);
};

/**
 * Get socket ID for a user
 * @param userId - User ID
 * @returns Socket ID if user is online, undefined otherwise
 */
export const getUserSocketId = (userId: string): string | undefined => {
  return connectedUsers.get(userId);
};

/**
 * Get total number of connected users
 * @returns Number of connected users
 */
export const getConnectedUsersCount = (): number => {
  return connectedUsers.size;
};
