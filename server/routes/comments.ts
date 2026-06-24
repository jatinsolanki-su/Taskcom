import { Router, Request, Response } from 'express';
import { AuthRequest, authenticateJWT } from '../middleware/auth.ts';
import { db } from '../db.ts';
import { apiRateLimiter, sanitizeInput } from '../middleware/security.ts';

const router = Router();

// Apply general API rate limiting to comments routes
router.use(apiRateLimiter);

// GET /api/comments/:ticketId - Retrieve all comments for a ticket
router.get('/:ticketId', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(400).json({ error: 'Invalid ticket ID format' });
    }

    const ticket = await db.getTicketById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const user = req.user!;
    if (user.role === 'Employee' && ticket.reporter_id !== user.id && ticket.assignee_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view comments for this ticket' });
    }

    const comments = await db.getComments(ticketId);
    res.json(comments);
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Internal server error while fetching comments' });
  }
});

// POST /api/comments - Add a new comment to a ticket
router.post('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId, content } = req.body;
    const user = req.user!;

    const parsedTicketId = parseInt(ticketId);

    if (isNaN(parsedTicketId) || parsedTicketId <= 0) {
      return res.status(400).json({ error: 'Invalid ticket ID format' });
    }

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({ error: 'Comment content is required and must be a valid non-empty string' });
    }

    const cleanContent = sanitizeInput(content.trim());
    if (cleanContent.length > 2000) {
      return res.status(400).json({ error: 'Comment content cannot exceed 2000 characters' });
    }

    // Verify ticket exists
    const ticket = await db.getTicketById(parsedTicketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Access Control: Employees can only comment on tickets they are assigned to or reported
    if (user.role === 'Employee' && ticket.reporter_id !== user.id && ticket.assignee_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden: Employees can only comment on tickets they are assigned to or have reported' });
    }

    // Add comment to database
    const comment = await db.addComment(parsedTicketId, user.id, cleanContent);

    // Register COMMENT_ADDED activity log
    await db.addActivity(
      parsedTicketId,
      user.id,
      'COMMENT_ADDED',
      null,
      null,
      `New comment added by ${user.name}: "${cleanContent.substring(0, 40)}${cleanContent.length > 40 ? '...' : ''}"`
    );

    // Send notifications to stakeholders
    // Notify Assignee (if not the commenter)
    if (ticket.assignee_id && ticket.assignee_id !== user.id) {
      await db.createNotification(
        ticket.assignee_id,
        'New Comment on Ticket',
        `${user.name} commented on ticket #${ticket.id}: "${ticket.title}"`,
        `/tickets/${ticket.id}`
      );
    }

    // Notify Reporter (if not the commenter and not the assignee)
    if (ticket.reporter_id && ticket.reporter_id !== user.id && ticket.reporter_id !== ticket.assignee_id) {
      await db.createNotification(
        ticket.reporter_id,
        'New Comment on Ticket',
        `${user.name} commented on ticket #${ticket.id}: "${ticket.title}"`,
        `/tickets/${ticket.id}`
      );
    }

    res.status(201).json(comment);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Internal server error while adding comment' });
  }
});

export default router;
