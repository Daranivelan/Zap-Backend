import { io } from "socket.io-client";

// JWT from /api/auth/login
const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEiLCJpYXQiOjE3NzA3MTU2NDcsImV4cCI6MTc3MDcxOTI0N30.brOlADtKBBYuEZj5oPVsQDnKqBtX9UxZp100NNLSwKI";

const socket = io("http://localhost:5001", {
  auth: {
    token: TOKEN,
  },
});

socket.on("connect", () => {
  console.log("🟢 User1 connected:", socket.id);

  // send message after 2 seconds
  setTimeout(() => {
    socket.emit("send_message", {
      to: "user-2",
      content: "Hello from User 1 👋",
    });
  }, 2000);
});

socket.on("receive_message", (msg) => {
  console.log("📩 User1 received:", msg);
});

socket.on("disconnect", () => {
  console.log("⚪ User1 disconnected");
});
