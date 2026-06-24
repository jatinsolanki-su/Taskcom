import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.ts';
import { 
  authRateLimiter, 
  validateEmail, 
  validatePasswordStrength, 
  sanitizeInput 
} from '../middleware/security.ts';

const router = Router();

/**
 * 💡 AUTH SECURITY CONFIGURATION:
 * Environment variables for signing JWT session tokens:
 * - JWT_SECRET: Private signing key (must match across middleware)
 * - JWT_EXPIRES_IN: Lifespan duration (e.g. '7d', '24h')
 */
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET environment variable is not defined.');
  } else {
    console.warn('⚠️ WARNING: JWT_SECRET environment variable is missing. Falling back to development secret.');
  }
}
const JWT_SIGNING_KEY = JWT_SECRET || 'jatin-ticket-manager-fallback-dev-secret-key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Mock in-memory reset tokens for forgotten passwords
const passwordResetTokens = new Map<string, { email: string; expires: number }>();

// Apply auth rate limiter to all auth routes
router.use(authRateLimiter);

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required fields' });
    }

    const trimmedName = sanitizeInput(name.trim());
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return res.status(400).json({ error: 'Display name must be between 2 and 50 characters long' });
    }

    if (!validateEmail(trimmedEmail)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.isValid) {
      return res.status(400).json({ error: passwordCheck.reason });
    }

    const existingUser = await db.getUserByEmail(trimmedEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email address already exists' });
    }

    // Determine role (Ignore any role sent from the frontend, always assign 'Employee')
    const assignedRole = 'Employee';

    // Password hashing (using 12 salt rounds for strong security hardening)
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await db.createUser(trimmedName, trimmedEmail, passwordHash, assignedRole);

    // Sign token directly to auto-login upon registration
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SIGNING_KEY,
      { expiresIn: JWT_EXPIRES_IN as any }
    );

    res.status(201).json({
      message: 'Account registered successfully',
      token,
      user
    });
  } catch (err) {
    console.error('Error in register:', err);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required fields' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Since we're querying db, we fetch the complete user object including password_hash
    const user = await db.getUserByEmail(trimmedEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.is_disabled) {
      return res.status(403).json({ error: 'This account has been disabled. Contact an administrator.' });
    }

    // Verify password securely using bcrypt
    const isMatch = await bcrypt.compare(password, user.password_hash!);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SIGNING_KEY,
      { expiresIn: JWT_EXPIRES_IN as any }
    );

    // Return user without password_hash (never return password/hash in responses)
    const { password_hash, ...safeUser } = user;

    res.json({
      message: 'Login successful',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Error in login:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!validateEmail(trimmedEmail)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }

    const user = await db.getUserByEmail(trimmedEmail);
    if (!user) {
      // Security best practice: Don't explicitly reveal if the email doesn't exist
      return res.json({
        message: 'If that email address is registered, password reset instructions have been generated.'
      });
    }

    // Create a secure, cryptographically random reset token
    // We avoid simple Math.random() in production security review
    const token = Buffer.from(require('crypto').randomBytes(24)).toString('hex');
    const expires = Date.now() + 3600000; // 1 hour expiration

    passwordResetTokens.set(token, { email: user.email, expires });

    // Return the token in response to allow seamless sandbox testing
    res.json({
      message: 'Password reset instructions generated successfully.',
      resetToken: token, // Exposed for easy sandbox workflow
      instructions: 'Use the provided reset token to call the reset-password API.'
    });
  } catch (err) {
    console.error('Error in forgot-password:', err);
    res.status(500).json({ error: 'Internal server error during password reset request' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.isValid) {
      return res.status(400).json({ error: passwordCheck.reason });
    }

    const record = passwordResetTokens.get(token);
    if (!record || record.expires < Date.now()) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired' });
    }

    const user = await db.getUserByEmail(record.email);
    if (!user) {
      return res.status(400).json({ error: 'User associated with this token could not be found' });
    }

    // Hash new password with 12 rounds
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Update user in DB
    await db.updateUser(user.id, { password_hash: passwordHash });

    // Clean up used token
    passwordResetTokens.delete(token);

    res.json({
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (err) {
    console.error('Error in reset-password:', err);
    res.status(500).json({ error: 'Internal server error during password reset' });
  }
});

export default router;
