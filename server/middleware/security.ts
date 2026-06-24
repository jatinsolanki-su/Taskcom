import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// 1. Rate Limiters
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: { error: 'Too many authentication attempts from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: { error: 'Too many API requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const ticketCreationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 ticket operations per windowMs
  message: { error: 'Too many ticket creation/update operations. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. Input Sanitization
export function sanitizeInput(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// 3. Validation Helpers
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  // RFC 5322 compatible email validation regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function validatePasswordStrength(password: string): { isValid: boolean; reason?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, reason: 'Password is required and must be a valid string.' };
  }
  if (password.length < 8) {
    return { isValid: false, reason: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, reason: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, reason: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, reason: 'Password must contain at least one numerical digit.' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, reason: 'Password must contain at least one special character (e.g., !@#$%^&*).' };
  }
  return { isValid: true };
}

// 4. Express Error Handler Middleware
export function centralErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Log detailed error internally on the server (never expose stack trace to clients)
  console.error('[SECURITY CENTRAL LOGGER] Error occurred:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Always fail securely with a safe user-facing message
  res.status(res.statusCode === 200 ? 500 : res.statusCode).json({
    error: 'An unexpected operational failure occurred. Your request was rejected for security and safety purposes.'
  });
}
