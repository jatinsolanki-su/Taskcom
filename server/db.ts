import mysql from 'mysql2/promise';

// Define TS Types
export interface User {
  id: number;
  name: string;
  email: string;
  password_hash?: string;
  role: 'Admin' | 'Employee';
  is_disabled?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Review' | 'Resolved' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  reporter_id: number;
  assignee_id: number | null;
  category?: string;
  created_at: string;
  updated_at: string;
  // Join properties
  reporter_name?: string;
  reporter_email?: string;
  assignee_name?: string | null;
  assignee_email?: string | null;
}

export interface Comment {
  id: number;
  ticket_id: number;
  user_id: number;
  content: string;
  created_at: string;
  // Join properties
  user_name?: string;
  user_role?: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface TicketActivity {
  id: number;
  ticket_id: number;
  user_id: number;
  activity_type: string;
  old_value: string | null;
  new_value: string | null;
  description: string;
  created_at: string;
  // Join properties
  user_name?: string;
}

// Global state for database connection
let mysqlPool: mysql.Pool | null = null;
let dbInitError: Error | null = null;

// Initialize Database Layer
export async function initDatabase() {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env;

  if (!DB_HOST || !DB_USER || !DB_NAME) {
    dbInitError = new Error('Database configuration error: DB_HOST, DB_USER, and DB_NAME environment variables are not defined. Please ensure your .env file is present with valid credentials.');
    console.warn('⚠️ ' + dbInitError.message);
    return;
  }

  try {
    mysqlPool = mysql.createPool({
      host: DB_HOST,
      port: Number(DB_PORT || 3306),
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test connection to ensure the MySQL database is available.
    const conn = await mysqlPool.getConnection();
    console.log('✅ Connected successfully to MySQL Database!');
    try {
      await conn.query("ALTER TABLE tickets ADD COLUMN category VARCHAR(100) DEFAULT 'General' NULL");
      console.log('✅ Category column added successfully to tickets table.');
    } catch (colErr: any) {
      // Ignore if column already exists
    }
    conn.release();
    dbInitError = null;
  } catch (err: any) {
    dbInitError = new Error(`Failed to connect to MySQL database: ${err.message}`);
    console.error('❌ ' + dbInitError.message);
    mysqlPool = null;
  }
}

function getPool(): mysql.Pool {
  if (dbInitError) {
    throw dbInitError;
  }
  if (!mysqlPool) {
    throw new Error('Database is not initialized. Please configure your MySQL credentials in the environment.');
  }
  return mysqlPool;
}

// Unified Service APIs
export const db = {
  // --- USERS ---
  async getUsers(): Promise<User[]> {
    const pool = getPool();
    const [rows] = await pool.query('SELECT id, name, email, role, created_at, updated_at FROM users ORDER BY id ASC');
    return rows as User[];
  },

  async getUserByEmail(email: string): Promise<User | null> {
    const trimmedEmail = email.trim().toLowerCase();
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) = ?', [trimmedEmail]);
    const list = rows as User[];
    return list.length ? list[0] : null;
  },

  async getUserById(id: number): Promise<User | null> {
    const pool = getPool();
    const [rows] = await pool.query('SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?', [id]);
    const list = rows as User[];
    return list.length ? list[0] : null;
  },

  async createUser(name: string, email: string, passwordHash: string, role: 'Admin' | 'Employee'): Promise<User> {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, role]
    );
    const insertId = (result as any).insertId;
    return { id: insertId, name, email, role };
  },

  async updateUser(id: number, updates: Partial<User>): Promise<boolean> {
    const pool = getPool();
    
    // Strict Whitelist to prevent parameter injection / mass-assignment
    const allowedKeys = ['name', 'email', 'role', 'password_hash', 'is_disabled'];
    const keys = Object.keys(updates).filter(k => allowedKeys.includes(k));
    
    if (keys.length === 0) return true;
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = [...keys.map(k => (updates as any)[k]), id];
    await pool.query(`UPDATE users SET ${setClause} WHERE id = ?`, values);
    return true;
  },

  // --- TICKETS ---
  async getTickets(): Promise<Ticket[]> {
    const pool = getPool();
    const query = `
      SELECT t.*, 
             r.name as reporter_name, r.email as reporter_email,
             a.name as assignee_name, a.email as assignee_email
      FROM tickets t
      JOIN users r ON t.reporter_id = r.id
      LEFT JOIN users a ON t.assignee_id = a.id
      ORDER BY t.created_at DESC
    `;
    const [rows] = await pool.query(query);
    return rows as Ticket[];
  },

  async getTicketById(id: number): Promise<Ticket | null> {
    const pool = getPool();
    const query = `
      SELECT t.*, 
             r.name as reporter_name, r.email as reporter_email,
             a.name as assignee_name, a.email as assignee_email
      FROM tickets t
      JOIN users r ON t.reporter_id = r.id
      LEFT JOIN users a ON t.assignee_id = a.id
      WHERE t.id = ?
    `;
    const [rows] = await pool.query(query, [id]);
    const list = rows as Ticket[];
    return list.length ? list[0] : null;
  },

  async createTicket(
    title: string,
    description: string,
    priority: Ticket['priority'],
    reporter_id: number,
    assignee_id: number | null = null,
    category: string = 'General'
  ): Promise<Ticket> {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO tickets (title, description, status, priority, reporter_id, assignee_id, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, description, 'Open', priority, reporter_id, assignee_id, category]
    );
    const insertId = (result as any).insertId;
    const t = await this.getTicketById(insertId);
    if (!t) {
      throw new Error('Failed to retrieve newly created ticket');
    }
    return t;
  },

  async updateTicket(id: number, updates: Partial<Ticket>): Promise<Ticket | null> {
    const pool = getPool();
    
    // Strict Whitelist to prevent parameter injection / mass-assignment
    const allowedKeys = ['title', 'description', 'status', 'priority', 'assignee_id', 'category'];
    const keys = Object.keys(updates).filter(k => allowedKeys.includes(k));
    
    if (keys.length > 0) {
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const values = [...keys.map(k => (updates as any)[k]), id];
      await pool.query(`UPDATE tickets SET ${setClause} WHERE id = ?`, values);
    }
    return this.getTicketById(id);
  },

  async deleteTicket(id: number): Promise<boolean> {
    const pool = getPool();
    const [res] = await pool.query('DELETE FROM tickets WHERE id = ?', [id]);
    return (res as any).affectedRows > 0;
  },

  // --- COMMENTS ---
  async getComments(ticketId: number): Promise<Comment[]> {
    const pool = getPool();
    const query = `
      SELECT c.*, u.name as user_name, u.role as user_role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.ticket_id = ?
      ORDER BY c.created_at ASC
    `;
    const [rows] = await pool.query(query, [ticketId]);
    return rows as Comment[];
  },

  async addComment(ticketId: number, userId: number, content: string): Promise<Comment> {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO comments (ticket_id, user_id, content) VALUES (?, ?, ?)',
      [ticketId, userId, content]
    );
    const insertId = (result as any).insertId;
    const [rows] = await pool.query(`
      SELECT c.*, u.name as user_name, u.role as user_role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [insertId]);
    return (rows as Comment[])[0];
  },

  // --- NOTIFICATIONS ---
  async getNotifications(userId: number): Promise<Notification[]> {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows as Notification[];
  },

  async createNotification(userId: number, title: string, message: string, link: string | null = null): Promise<Notification> {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO notifications (user_id, title, message, link, is_read) VALUES (?, ?, ?, ?, ?)',
      [userId, title, message, link, false]
    );
    const insertId = (result as any).insertId;
    return {
      id: insertId,
      user_id: userId,
      title,
      message,
      is_read: false,
      link,
      created_at: new Date().toISOString()
    };
  },

  async markNotificationsAsRead(userId: number): Promise<boolean> {
    const pool = getPool();
    await pool.query('UPDATE notifications SET is_read = ? WHERE user_id = ?', [true, userId]);
    return true;
  },

  // --- TICKET ACTIVITY ---
  async getActivity(ticketId: number): Promise<TicketActivity[]> {
    const pool = getPool();
    const query = `
      SELECT ta.*, u.name as user_name
      FROM ticket_activity ta
      JOIN users u ON ta.user_id = u.id
      WHERE ta.ticket_id = ?
      ORDER BY ta.created_at DESC
    `;
    const [rows] = await pool.query(query, [ticketId]);
    return rows as TicketActivity[];
  },

  async addActivity(
    ticketId: number,
    userId: number,
    activityType: string,
    oldValue: string | null,
    newValue: string | null,
    description: string
  ): Promise<TicketActivity> {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO ticket_activity (ticket_id, user_id, activity_type, old_value, new_value, description) VALUES (?, ?, ?, ?, ?, ?)',
      [ticketId, userId, activityType, oldValue, newValue, description]
    );
    const insertId = (result as any).insertId;
    const [rows] = await pool.query(`
      SELECT ta.*, u.name as user_name
      FROM ticket_activity ta
      JOIN users u ON ta.user_id = u.id
      WHERE ta.id = ?
    `, [insertId]);
    return (rows as TicketActivity[])[0];
  }
};
