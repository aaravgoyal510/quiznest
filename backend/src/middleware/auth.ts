import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db";

// Extend the Express Request type globally to hold the verified user payload
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: "ADMIN" | "TEACHER" | "STUDENT";
        tokenVersion: number;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "split-app-secret-jwt-token-2026-key-development";

/**
 * Middleware to verify the JWT token and validate active user token version.
 */
export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: "ADMIN" | "TEACHER" | "STUDENT";
      tokenVersion: number;
    };

    // Query database point-lookup to verify user exists and session is valid (tokenVersion check)
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { tokenVersion: true },
    });

    if (!dbUser) {
      return res.status(401).json({ error: "Session expired. User no longer exists." });
    }

    if (dbUser.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: "Session invalidated. Please log in again." });
    }

    // Attach decoded user payload to request context
    req.user = decoded;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: "Invalid or expired session token." });
  }
}

/**
 * Middleware to restrict endpoints to specific roles.
 */
export function requireRole(allowedRoles: ("ADMIN" | "TEACHER" | "STUDENT")[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Access restricted to roles [${allowedRoles.join(", ")}]` });
    }

    next();
  };
}
