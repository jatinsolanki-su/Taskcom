export interface User {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Employee';
  is_disabled?: boolean | number;
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
  created_at: string;
  updated_at: string;
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
  user_name?: string;
}
