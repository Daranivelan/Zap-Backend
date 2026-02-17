import { Router } from "express";
import { generateToken } from "../utils/jwt.js";
import { loginUser, registerUser } from "../services/auth.service.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await registerUser(username, password);

    res.json({ message: "User Created", userId: user.id });
  } catch (error) {
    res.status(400).json({ message: "Registration Failed..!" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await loginUser(username, password);
    const token = generateToken({ userId: user.id });

    res.json({ token });
  } catch {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

export default router;
