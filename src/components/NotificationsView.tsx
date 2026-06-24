import React from 'react';
import { motion } from 'motion/react';
import { Bell, CheckSquare, ShieldCheck, Mail, Calendar, AlertCircle } from 'lucide-react';
import { Notification } from '../types.ts';

interface NotificationsViewProps {
  notifications: Notification[];
  onMarkRead: () => void;
  onSelectTicket: (ticketId: number) => void;
  darkMode: boolean;
}

export default function NotificationsView({
  notifications,
  onMarkRead,
  onSelectTicket,
  darkMode
}: NotificationsViewProps) {
  
  const handleLinkClick = (link: string | null) => {
    if (!link) return;
    // Extract ID from e.g. "/tickets/12"
    const match = link.match(/\/tickets\/(\d+)/);
    if (match) {
      onSelectTicket(parseInt(match[1]));
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800/30">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-text-p' : 'text-gray-900'}`}>
            Operational Notifications
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            System status updates, assignee allocations, and stakeholder feedback streams.
          </p>
        </div>

        {notifications.some(n => !n.is_read) && (
          <button
            onClick={onMarkRead}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent-blue/10 text-accent-blue border border-accent-blue/20 hover:bg-accent-blue hover:text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
          >
            <CheckSquare className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notification feed cards */}
      {notifications.length === 0 ? (
        <div className={`p-12 text-center rounded-xl border ${
          darkMode ? 'bg-surface-dark border-border-dark shadow-black/5' : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <Bell className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400 font-semibold">Inbox is clear</p>
          <p className="text-xs text-gray-500 mt-1">There are no operational warnings or updates registered for your user account.</p>
        </div>
      ) : (
        <div className={`rounded-xl border overflow-hidden divide-y divide-border-dark/30 ${
          darkMode ? 'bg-surface-dark border-border-dark shadow-black/5' : 'bg-white border-gray-200'
        }`}>
          {notifications.map(n => (
            <div 
              key={n.id}
              onClick={() => n.link && handleLinkClick(n.link)}
              className={`p-4 text-sm transition-colors relative flex items-start gap-3.5 ${
                n.link ? 'cursor-pointer hover:bg-surface-dark/40' : ''
              } ${
                !n.is_read 
                  ? darkMode ? 'bg-accent-blue/5' : 'bg-blue-50/40 font-medium' 
                  : ''
              }`}
            >
              {/* Unread circle bar on margins */}
              {!n.is_read && (
                <span className="absolute left-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 bg-blue-500 rounded-full" />
              )}

              {/* Status icon indicators */}
              <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${
                !n.is_read 
                  ? darkMode ? 'bg-accent-blue/10 text-accent-blue' : 'bg-blue-100 text-blue-600'
                  : 'bg-gray-800/40 text-gray-500'
              }`}>
                {n.title.toLowerCase().includes('delete') ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
              </div>

              {/* Message */}
              <div className="space-y-1 flex-grow">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-semibold ${
                    !n.is_read 
                      ? darkMode ? 'text-text-p' : 'text-gray-950'
                      : 'text-gray-400'
                  }`}>
                    {n.title}
                  </h4>
                  <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1 shrink-0">
                    <Calendar className="h-3 w-3" />
                    {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{n.message}</p>
                
                {n.link && (
                  <span className="text-[10px] text-blue-500 font-mono hover:underline block mt-1.5">
                    Inspect associated record →
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
