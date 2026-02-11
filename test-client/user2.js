import { io } from "socket.io-client";

// JWT from /api/auth/login
const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTIiLCJpYXQiOjE3NzA3MTU2NTIsImV4cCI6MTc3MDcxOTI1Mn0.svpYZG2ZUoY9aRTAEwgGRERlt9EZEy9wYiRRBGQTeJI";

const socket = io("http://localhost:5001", {
  auth: {
    token: TOKEN,
  },
});

socket.on("connect", () => {
  console.log("🟢 User2 connected:", socket.id);
});

socket.on("receive_message", (msg) => {
  console.log("📩 User2 received:", msg);
});

socket.on("disconnect", () => {
  console.log("⚪ User2 disconnected");
});
