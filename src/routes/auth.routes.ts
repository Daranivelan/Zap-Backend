import { Router } from "express";
import { generateToken } from "../utils/jwt.js";

const router = Router();

router.post("/login", (req, res) => {
  // const { username, password } = req.body;

  // if (username !== "darani" || password !== "123456") {
  //   return res.status(401).json({
  //     message: "Invalid credentials",
  //   });
  // }

  // const token = generateToken({
  //   userId: "user-1",
  // });

  // res.json({
  //   token,
  // });

  const { username, password } = req.body;

  if (username === "user1" && password === "123") {
    return res.json({
      token: generateToken({ userId: "user-1" }),
    });
  }

  if (username === "user2" && password === "123") {
    return res.json({
      token: generateToken({ userId: "user-2" }),
    });
  }

  res.status(401).json({ message: "Invalid credentials" });
});

export default router;
