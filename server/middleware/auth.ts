import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db.ts';

/**
 * 💡 SECURITY CONFIGURATION:
 * The security token validator uses the JWT_SECRET environment variable to sign and verify user authentication tokens.
 * Set this variable in your root `.env` or the AI Studio Secrets panel:
 * 
 * - JWT_SECRET: A strong random string for cryptographically signing JSON Web Tokens.
 */
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET environment variable is not defined.');
  } else {
    console.warn('⚠️ WARNING: JWT_SECRET environment variable is missing in auth middleware.');
  }
}
const JWT_SIGNING_KEY = JWT_SECRET || 'jatin-ticket-manager-fallback-dev-secret-key-2026';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    role: 'Admin' | 'Employee';
  };
}

export function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({ error: 'Authentication token missing or invalid format' });
    }

    jwt.verify(token, JWT_SIGNING_KEY, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Authentication token is invalid, expired, or tampered with' });
      }

      const decodedUser = decoded as any;
      try {
        const dbUser = await db.getUserById(decodedUser.id);
        if (!dbUser) {
          return res.status(403).json({ error: 'Account associated with this token no longer exists' });
        }
        if (dbUser.is_disabled) {
          return res.status(403).json({ error: 'This account has been disabled. Access denied.' });
        }

        // Always attach the latest role from the database, preventing token-spoofing of roles
        req.user = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role
        };
        next();
      } catch (dbErr) {
        console.error('Database validation error in authenticateJWT:', dbErr);
        return res.status(500).json({ error: 'Internal server verification error' });
      }
    });
  } else {
    res.status(401).json({ error: 'Authorization header is required' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden: Admin privilege is required to access this resource' });
  }

  next();
}

export function requireRole(role: 'Admin' | 'Employee') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== role && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
}
