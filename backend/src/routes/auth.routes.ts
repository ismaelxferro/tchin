import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { email, username, fullName, password, role } = req.body;

    if (!email || !username || !fullName || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (role !== "TEACHER" && role !== "STUDENT") {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email or username already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        fullName,
        passwordHash,
        role
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: "Register error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password and role are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || user.role !== role) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Login error" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      role: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

export default router;