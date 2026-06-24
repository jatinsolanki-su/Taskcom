import { User, Ticket, Comment, Notification, TicketActivity } from './types.ts';

const API_BASE =
  (import.meta as any).env.VITE_API_URL ||
  'https://taskcom-production.up.railway.app/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response, isAuthRoute = false): Promise<T> {
  if (response.status === 401) {
    if (!isAuthRoute && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Force a light-weight app state update by triggering custom event or reloading if needed
      window.dispatchEvent(new Event('auth-status-change'));
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Session expired. Please log in.');
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User; message: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse<{ token: string; user: User; message: string }>(res, true);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.dispatchEvent(new Event('auth-status-change'));
    return data;
  },

  async register(name: string, email: string, password: string, role: 'Admin' | 'Employee' = 'Employee'): Promise<{ token: string; user: User; message: string }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await handleResponse<{ token: string; user: User; message: string }>(res, true);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.dispatchEvent(new Event('auth-status-change'));
    return data;
  },

  async forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse<{ message: string; resetToken?: string }>(res);
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    return handleResponse<{ message: string }>(res);
  },

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-status-change'));
  },

  // Tickets
  async getTickets(filters?: { scope?: 'my' | 'assigned' | 'all'; status?: string; priority?: string }): Promise<Ticket[]> {
    let url = `${API_BASE}/tickets`;
    const params = new URLSearchParams();
    if (filters?.scope) params.append('scope', filters.scope);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    
    const queryStr = params.toString();
    if (queryStr) {
      url += `?${queryStr}`;
    }

    const res = await fetch(url, {
      headers: getHeaders(),
    });
    return handleResponse<Ticket[]>(res);
  },

  async getTicketById(id: number): Promise<{ ticket: Ticket; comments: Comment[]; activities: TicketActivity[] }> {
    const res = await fetch(`${API_BASE}/tickets/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse<{ ticket: Ticket; comments: Comment[]; activities: TicketActivity[] }>(res);
  },

  async createTicket(ticket: { title: string; description: string; priority: string; assignee_id: number | null; category?: string }): Promise<Ticket> {
    const res = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(ticket),
    });
    return handleResponse<Ticket>(res);
  },

  async updateTicket(id: number, ticket: Partial<Ticket>): Promise<Ticket> {
    const res = await fetch(`${API_BASE}/tickets/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(ticket),
    });
    return handleResponse<Ticket>(res);
  },

  async deleteTicket(id: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/tickets/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<{ message: string }>(res);
  },

  // Comments
  async getComments(ticketId: number): Promise<Comment[]> {
    const res = await fetch(`${API_BASE}/comments/${ticketId}`, {
      headers: getHeaders(),
    });
    return handleResponse<Comment[]>(res);
  },

  async addComment(ticketId: number, content: string): Promise<Comment> {
    const res = await fetch(`${API_BASE}/comments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ticketId, content }),
    });
    return handleResponse<Comment>(res);
  },

  // Users
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`, {
      headers: getHeaders(),
    });
    return handleResponse<User[]>(res);
  },

  async updateUser(id: number, payload: { name?: string; email?: string; role?: string; password?: string; is_disabled?: boolean }): Promise<{ message: string; user: User }> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<{ message: string; user: User }>(res);
  },

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getHeaders(),
    });
    return handleResponse<Notification[]>(res);
  },

  async markNotificationsAsRead(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/notifications/read`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  }
};
