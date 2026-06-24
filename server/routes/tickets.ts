import { Router, Response } from 'express';
import { AuthRequest, authenticateJWT, requireAdmin } from '../middleware/auth.ts';
import { db } from '../db.ts';
import { 
  ticketCreationRateLimiter, 
  apiRateLimiter, 
  sanitizeInput 
} from '../middleware/security.ts';

const router = Router();

// Apply general API rate limiter to all ticket queries
router.get('/', apiRateLimiter, authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const tickets = await db.getTickets();
    const user = req.user!;

    // Filter based on query params or user role if requested
    const { scope, status, priority } = req.query;

    let filtered = tickets;

    // Enforce strict access control: Employees can ONLY see tickets they reported or are assigned to
    if (user.role === 'Employee') {
      filtered = filtered.filter(t => t.reporter_id === user.id || t.assignee_id === user.id);
    }

    if (scope === 'my') {
      filtered = filtered.filter(t => t.reporter_id === user.id);
    } else if (scope === 'assigned') {
      filtered = filtered.filter(t => t.assignee_id === user.id);
    }

    if (status && typeof status === 'string') {
      filtered = filtered.filter(t => t.status === status);
    }

    if (priority && typeof priority === 'string') {
      filtered = filtered.filter(t => t.priority === priority);
    }

    res.json(filtered);
  } catch (err) {
    console.error('Error fetching tickets:', err);
    res.status(500).json({ error: 'Internal server error while fetching tickets' });
  }
});

// GET /api/tickets/:id - Retrieve detailed single ticket
router.get('/:id', apiRateLimiter, authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid ticket ID format' });
    }

    const ticket = await db.getTicketById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Enforce strict access control: Employees can ONLY view tickets they reported or are assigned to
    const user = req.user!;
    if (user.role === 'Employee' && ticket.reporter_id !== user.id && ticket.assignee_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view this ticket' });
    }

    // Fetch comments and activity logs associated with this ticket
    const comments = await db.getComments(id);
    const activities = await db.getActivity(id);

    res.json({
      ticket,
      comments,
      activities
    });
  } catch (err) {
    console.error('Error fetching ticket detail:', err);
    res.status(500).json({ error: 'Internal server error while fetching ticket' });
  }
});

// POST /api/tickets - Create a new ticket
router.post('/', ticketCreationRateLimiter, authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, priority, assignee_id, category } = req.body;
    const user = req.user!;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required and must be a valid string' });
    }
    if (!description || typeof description !== 'string' || description.trim() === '') {
      return res.status(400).json({ error: 'Description is required and must be a valid string' });
    }

    const cleanTitle = sanitizeInput(title.trim());
    const cleanDescription = sanitizeInput(description.trim());

    if (cleanTitle.length < 3 || cleanTitle.length > 100) {
      return res.status(400).json({ error: 'Title must be between 3 and 100 characters long' });
    }

    if (cleanDescription.length < 5 || cleanDescription.length > 3000) {
      return res.status(400).json({ error: 'Description must be between 5 and 3000 characters long' });
    }

    const allowedPriorities = ['Low', 'Medium', 'High', 'Critical'];
    let finalPriority = 'Medium';
    if (priority && allowedPriorities.includes(priority)) {
      finalPriority = priority;
    }

    let finalAssigneeId = assignee_id ? parseInt(assignee_id) : null;
    if (finalAssigneeId !== null && (isNaN(finalAssigneeId) || finalAssigneeId <= 0)) {
      return res.status(400).json({ error: 'Invalid assignee ID format' });
    }

    const cleanCategory = category ? sanitizeInput(category.trim()).substring(0, 50) : 'General';

    // Enforce role-based behavior:
    // Employees cannot assign tickets, set assignee, or change priority during creation
    if (user.role === 'Employee') {
      finalPriority = 'Medium';
      finalAssigneeId = null;
    }

    // Create ticket in DB with category
    const ticket = await db.createTicket(
      cleanTitle,
      cleanDescription,
      finalPriority as any,
      user.id,
      finalAssigneeId,
      cleanCategory
    );

    // Create activity timeline entry
    await db.addActivity(
      ticket.id,
      user.id,
      'CREATED',
      null,
      'Open',
      `Ticket "${cleanTitle}" was created by ${user.name}`
    );

    // Notify assignee if assigned
    if (finalAssigneeId) {
      await db.createNotification(
        finalAssigneeId,
        'New Ticket Assigned',
        `You have been assigned ticket #${ticket.id}: "${title}" by ${user.name}`,
        `/tickets/${ticket.id}`
      );
    }

    // Notify all Admins of a new ticket
    const users = await db.getUsers();
    const admins = users.filter(u => u.role === 'Admin' && u.id !== user.id);
    for (const admin of admins) {
      await db.createNotification(
        admin.id,
        'Ticket Created',
        `A new ticket #${ticket.id}: "${title}" has been created by ${user.name}`,
        `/tickets/${ticket.id}`
      );
    }

    res.status(201).json(ticket);
  } catch (err) {
    console.error('Error creating ticket:', err);
    res.status(500).json({ error: 'Internal server error while creating ticket' });
  }
});

// PUT /api/tickets/:id - Edit an existing ticket
router.put('/:id', ticketCreationRateLimiter, authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid ticket ID format' });
    }

    const { title, description, priority, status, assignee_id, category } = req.body;
    const user = req.user!;

    const existing = await db.getTicketById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Authorization: Employees can edit tickets they report or are assigned to. Admins can edit everything.
    const isReporter = existing.reporter_id === user.id;
    const isAssignee = existing.assignee_id === user.id;
    const isAdmin = user.role === 'Admin';

    if (!isReporter && !isAssignee && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to modify this ticket' });
    }

    // Input Validation
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ error: 'Title must be a valid string' });
      }
      const cleanTitle = sanitizeInput(title.trim());
      if (cleanTitle.length < 3 || cleanTitle.length > 100) {
        return res.status(400).json({ error: 'Title must be between 3 and 100 characters long' });
      }
    }

    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim() === '') {
        return res.status(400).json({ error: 'Description must be a valid string' });
      }
      const cleanDescription = sanitizeInput(description.trim());
      if (cleanDescription.length < 5 || cleanDescription.length > 3000) {
        return res.status(400).json({ error: 'Description must be between 5 and 3000 characters long' });
      }
    }

    const allowedPriorities = ['Low', 'Medium', 'High', 'Critical'];
    if (priority !== undefined && !allowedPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority level' });
    }

    const allowedStatuses = ['Open', 'In Progress', 'Review', 'Resolved', 'Closed'];
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid ticket status' });
    }

    // Role-based restrictions for non-Admins
    if (!isAdmin) {
      // 1. Cannot change priority
      if (priority !== undefined && priority !== existing.priority) {
        return res.status(403).json({ error: 'Forbidden: Only administrators can change priority levels' });
      }

      // 2. Cannot reassign ticket
      if (assignee_id !== undefined) {
        const targetAssigneeId = assignee_id ? parseInt(assignee_id) : null;
        if (targetAssigneeId !== existing.assignee_id) {
          return res.status(403).json({ error: 'Forbidden: Only administrators can assign or reassign personnel' });
        }
      }

      // 3. Status transitions
      if (status !== undefined && status !== existing.status) {
        if (isReporter && !isAssignee) {
          // Ticket owners (not assigned) can only close or reopen
          if (status !== 'Closed' && status !== 'Open') {
            return res.status(403).json({ error: 'Forbidden: Ticket owners can only close or reopen their own tickets' });
          }
        } else if (!isAssignee) {
          // Neither assignee nor reporter (should be caught by initial auth, but extra safety)
          return res.status(403).json({ error: 'Forbidden: Only assigned personnel or administrators can update status' });
        }
      }
    }

    const updates: any = {};
    const activitiesToLog: Array<{ type: string; oldVal: string | null; newVal: string | null; desc: string }> = [];

    if (title !== undefined && title.trim() !== existing.title) {
      const cleanTitle = sanitizeInput(title.trim());
      updates.title = cleanTitle;
      activitiesToLog.push({
        type: 'TITLE_CHANGE',
        oldVal: existing.title,
        newVal: cleanTitle,
        desc: `Title updated from "${existing.title}" to "${cleanTitle}"`
      });
    }

    if (description !== undefined && description.trim() !== existing.description) {
      const cleanDescription = sanitizeInput(description.trim());
      updates.description = cleanDescription;
      activitiesToLog.push({
        type: 'DESC_CHANGE',
        oldVal: null,
        newVal: null,
        desc: `Description was updated`
      });
    }

    if (priority !== undefined && priority !== existing.priority) {
      updates.priority = priority;
      activitiesToLog.push({
        type: 'PRIORITY_CHANGE',
        oldVal: existing.priority,
        newVal: priority,
        desc: `Priority escalated/changed from ${existing.priority} to ${priority}`
      });
    }

    if (status !== undefined && status !== existing.status) {
      updates.status = status;
      activitiesToLog.push({
        type: 'STATUS_CHANGE',
        oldVal: existing.status,
        newVal: status,
        desc: `Status transitioned from ${existing.status} to ${status}`
      });

      // Send status update notification to Reporter and Assignee
      if (existing.reporter_id !== user.id) {
        await db.createNotification(
          existing.reporter_id,
          'Ticket Status Update',
          `The status of ticket #${existing.id} has been changed to "${status}" by ${user.name}`,
          `/tickets/${existing.id}`
        );
      }
      if (existing.assignee_id && existing.assignee_id !== user.id) {
        await db.createNotification(
          existing.assignee_id,
          'Ticket Status Update',
          `The status of ticket #${existing.id} has been changed to "${status}" by ${user.name}`,
          `/tickets/${existing.id}`
        );
      }
    }

    if (category !== undefined) {
      const cleanCategory = sanitizeInput(category.trim()).substring(0, 50);
      if (cleanCategory !== existing.category) {
        updates.category = cleanCategory;
        activitiesToLog.push({
          type: 'CATEGORY_CHANGE',
          oldVal: existing.category || 'General',
          newVal: cleanCategory,
          desc: `Category shifted from "${existing.category || 'General'}" to "${cleanCategory}"`
        });
      }
    }

    const newAssigneeId = assignee_id !== undefined ? (assignee_id ? parseInt(assignee_id) : null) : undefined;
    if (newAssigneeId !== undefined && newAssigneeId !== existing.assignee_id) {
      if (newAssigneeId !== null && (isNaN(newAssigneeId) || newAssigneeId <= 0)) {
        return res.status(400).json({ error: 'Invalid assignee ID format' });
      }
      updates.assignee_id = newAssigneeId;

      const allUsers = await db.getUsers();
      const oldAssignee = existing.assignee_id ? allUsers.find(u => u.id === existing.assignee_id) : null;
      const newAssignee = newAssigneeId ? allUsers.find(u => u.id === newAssigneeId) : null;

      const oldName = oldAssignee ? oldAssignee.name : 'Unassigned';
      const newName = newAssignee ? newAssignee.name : 'Unassigned';

      activitiesToLog.push({
        type: 'ASSIGNEE_CHANGE',
        oldVal: oldName,
        newVal: newName,
        desc: `Assignment shifted from ${oldName} to ${newName}`
      });

      // Notify new assignee
      if (newAssigneeId && newAssigneeId !== user.id) {
        await db.createNotification(
          newAssigneeId,
          'Ticket Assigned To You',
          `Ticket #${existing.id} was assigned to you by ${user.name}`,
          `/tickets/${existing.id}`
        );
      }
      // Notify old assignee
      if (existing.assignee_id && existing.assignee_id !== user.id) {
        await db.createNotification(
          existing.assignee_id,
          'Ticket Assignment Revoked',
          `You have been unassigned from ticket #${existing.id} by ${user.name}`,
          `/tickets/${existing.id}`
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.json(existing);
    }

    const updatedTicket = await db.updateTicket(id, updates);

    // Save all activities to database
    for (const act of activitiesToLog) {
      await db.addActivity(id, user.id, act.type, act.oldVal, act.newVal, act.desc);
    }

    res.json(updatedTicket);
  } catch (err) {
    console.error('Error updating ticket:', err);
    res.status(500).json({ error: 'Internal server error while updating ticket' });
  }
});

// DELETE /api/tickets/:id - Delete ticket (Admin only)
router.delete('/:id', apiRateLimiter, authenticateJWT, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid ticket ID format' });
    }

    const ticket = await db.getTicketById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const deleted = await db.deleteTicket(id);
    if (!deleted) {
      return res.status(400).json({ error: 'Failed to delete ticket' });
    }

    // Notify assignee of deletion (if any)
    if (ticket.assignee_id) {
      await db.createNotification(
        ticket.assignee_id,
        'Ticket Deleted',
        `Ticket #${ticket.id}: "${ticket.title}" has been deleted by Admin ${req.user!.name}`,
        null
      );
    }

    res.json({ message: `Ticket #${id} deleted successfully` });
  } catch (err) {
    console.error('Error deleting ticket:', err);
    res.status(500).json({ error: 'Internal server error while deleting ticket' });
  }
});

export default router;
