import { Router, Response } from 'express';
import { AuthRequest, authenticateJWT } from '../middleware/auth.ts';
import { db } from '../db.ts';
import { apiRateLimiter } from '../middleware/security.ts';

const router = Router();

// Apply general API rate limiting to notifications routes
router.use(apiRateLimiter);

// GET /api/notifications - Fetch notifications for currently logged-in user
router.get('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const list = await db.getNotifications(user.id);
    res.json(list);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Internal server error while fetching notification list' });
  }
});

// PUT /api/notifications/read - Mark all notifications as read for current user
router.put('/read', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    await db.markNotificationsAsRead(user.id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking notifications as read:', err);
    res.status(500).json({ error: 'Internal server error while updating notification status' });
  }
});

export default router;
