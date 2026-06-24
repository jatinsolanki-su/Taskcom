import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest, authenticateJWT, requireAdmin } from '../middleware/auth.ts';
import { db } from '../db.ts';
import { 
  apiRateLimiter, 
  validateEmail, 
  validatePasswordStrength, 
  sanitizeInput 
} from '../middleware/security.ts';

const router = Router();

// Apply general API rate limiting to user routes
router.use(apiRateLimiter);

// GET /api/users - List all users (For ticket assignment selection and user management)
// Admins get everything. Employees get simple select list (ID, name, email, role) to assign.
router.get('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const list = await db.getUsers();

    if (currentUser.role === 'Employee') {
      // Employees only see active (non-disabled) users and only safe public fields
      const activeUsers = list
        .filter(u => !u.is_disabled)
        .map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role
        }));
      return res.json(activeUsers);
    }

    res.json(list);
  } catch (err) {
    console.error('Error listing users:', err);
    res.status(500).json({ error: 'Internal server error while retrieving team roster' });
  }
});

// PUT /api/users/:id - Update user details
router.put('/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.id);
    if (isNaN(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const { name, email, role, password, is_disabled } = req.body;
    const currentUser = req.user!;

    // Check permissions:
    // Only Admins can update OTHER users.
    // Non-Admins can ONLY update THEMSELVES.
    const isSelf = currentUser.id === targetUserId;
    const isAdmin = currentUser.role === 'Admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges to modify this profile' });
    }

    const targetUser = await db.getUserById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const updates: any = {};

    if (name !== undefined) {
      const trimmedName = sanitizeInput(name.trim());
      if (trimmedName.length < 2 || trimmedName.length > 50) {
        return res.status(400).json({ error: 'Display name must be between 2 and 50 characters long' });
      }
      updates.name = trimmedName;
    }

    if (email !== undefined) {
      const trimmedEmail = email.trim().toLowerCase();
      if (!validateEmail(trimmedEmail)) {
        return res.status(400).json({ error: 'Invalid email address format' });
      }

      const existing = await db.getUserByEmail(trimmedEmail);
      if (existing && existing.id !== targetUserId) {
        return res.status(400).json({ error: 'An account with this email already exists' });
      }
      updates.email = trimmedEmail;
    }

    // Only Admins can elevate or change roles
    if (role && role !== targetUser.role) {
      if (!isAdmin) {
        return res.status(403).json({ error: 'Forbidden: Only administrators can modify roles' });
      }
      if (role !== 'Admin' && role !== 'Employee') {
        return res.status(400).json({ error: 'Invalid role assignment type' });
      }
      updates.role = role;
    }

    // Only Admins can enable or disable user accounts
    if (is_disabled !== undefined) {
      if (!isAdmin) {
        return res.status(403).json({ error: 'Forbidden: Only administrators can enable/disable user accounts' });
      }
      updates.is_disabled = is_disabled ? 1 : 0;
    }

    // Optional: Handle password update
    if (password && password.trim() !== '') {
      const passwordCheck = validatePasswordStrength(password);
      if (!passwordCheck.isValid) {
        return res.status(400).json({ error: passwordCheck.reason });
      }
      // Hash with 12 salt rounds for strong security hardening
      const salt = await bcrypt.genSalt(12);
      updates.password_hash = await bcrypt.hash(password, salt);
    }

    if (Object.keys(updates).length === 0) {
      const cleanUser = await db.getUserById(targetUserId);
      return res.json({ message: 'No updates provided', user: cleanUser });
    }

    await db.updateUser(targetUserId, updates);

    // Fetch and return the updated user (safely without password hash)
    const updatedUser = await db.getUserById(targetUserId);

    res.json({
      message: 'User profile updated successfully',
      user: updatedUser
    });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Internal server error while modifying profile' });
  }
});

export default router;
