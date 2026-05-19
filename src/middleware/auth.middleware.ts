import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/jwt.service";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res
        .status(401)
        .json({ error: "Unauthorized", message: "No token provided" });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        provider: true,
      },
    });

    if (!user) {
      res
        .status(401)
        .json({ error: "Unauthorized", message: "User not found" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res
      .status(401)
      .json({ error: "Unauthorized", message: "Invalid or expired token" });
  }
};
