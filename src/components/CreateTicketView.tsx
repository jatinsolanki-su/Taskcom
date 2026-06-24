import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Save, ShieldAlert, FolderKanban } from 'lucide-react';
import { User } from '../types.ts';
import { api } from '../api.ts';

interface CreateTicketViewProps {
  currentUser: User;
  onBack: () => void;
  onSuccess: (id: number) => void;
  darkMode: boolean;
}

export default function CreateTicketView({
  currentUser,
  onBack,
  onSuccess,
  darkMode
}: CreateTicketViewProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [category, setCategory] = useState<string>('General');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<User[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'Admin';

  // Fetch team members list for assignments
  useEffect(() => {
    const loadTeam = async () => {
      try {
        const team = await api.getUsers();
        setTeamMembers(team);
      } catch (err: any) {
        console.error('Failed to load team roster for creation assignments:', err);
      }
    };
    loadTeam();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError('Title and Description are required operational parameters.');
      return;
    }

    try {
      setSubmitting(true);
      const ticket = await api.createTicket({
        title: title.trim(),
        description: description.trim(),
        priority: isAdmin ? priority : 'Medium',
        assignee_id: isAdmin && assigneeId ? parseInt(assigneeId) : null,
        category: category
      });

      onSuccess(ticket.id);
    } catch (err: any) {
      setError(err.message || 'An error occurred during ticket registration');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-800/30">
        <button
          onClick={onBack}
          type="button"
          className={`p-2 rounded-lg border transition-colors ${
            darkMode ? 'hover:bg-surface-dark border-border-dark text-text-s' : 'hover:bg-gray-50 border-gray-200 text-gray-600'
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <span className="text-xs font-mono text-gray-500 block">CREATE OPERATIONS LOG</span>
          <h1 className={`text-xl font-bold mt-1 ${darkMode ? 'text-text-p' : 'text-gray-950'}`}>
            Register New Issue
          </h1>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-lg bg-red-600/10 text-red-400 border border-red-500/20 text-xs font-medium flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className={`p-6 rounded-xl border space-y-5 ${
        darkMode ? 'bg-surface-dark border-border-dark shadow-black/5' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        {/* Ticket Title */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-2">Issue Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Kubernetes Ingress Routing Timeout / API Gateway Failures"
            className={`w-full px-4 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue ${
              darkMode 
                ? 'bg-bg-dark border-border-dark text-text-p placeholder-gray-500' 
                : 'bg-gray-50 border-gray-200 text-gray-950 placeholder-gray-400'
            }`}
          />
        </div>

        {/* Ticket Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-2">Description / Log details</label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Document all diagnostic reports, replication steps, and current error stack traces..."
            rows={8}
            className={`w-full p-4 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue ${
              darkMode 
                ? 'bg-bg-dark border-border-dark text-text-p placeholder-gray-500' 
                : 'bg-gray-50 border-gray-200 text-gray-950 placeholder-gray-400'
            }`}
          />
        </div>

        {/* Priority & Assignee Select Controls */}
        {isAdmin ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-2">Category / Department</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue ${
                  darkMode 
                    ? 'bg-bg-dark border-border-dark text-text-p' 
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
              >
                <option value="General">General / Other</option>
                <option value="IT Support">IT Support</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-2">Operational Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue ${
                  darkMode 
                    ? 'bg-bg-dark border-border-dark text-text-p' 
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
              >
                <option value="Low">Low - Deferred Action</option>
                <option value="Medium">Medium - Regular Queue</option>
                <option value="High">High - Escalated Queue</option>
                <option value="Critical">Critical - Production Downtime / Intervention</option>
              </select>
            </div>

            {/* Initial Assignee */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-2">Assign Team Personnel</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue ${
                  darkMode 
                    ? 'bg-bg-dark border-border-dark text-text-p' 
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
              >
                <option value="">Leave Unassigned (Sandbox Queue)</option>
                {teamMembers.map(tm => (
                  <option key={tm.id} value={tm.id}>{tm.name} ({tm.role})</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-2">Category / Department</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue ${
                  darkMode 
                    ? 'bg-bg-dark border-border-dark text-text-p' 
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
              >
                <option value="General">General / Other</option>
                <option value="IT Support">IT Support</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
              </select>
            </div>

            {/* Info panel showing that priority and assignment rules are automatically handled */}
            <div className="flex flex-col justify-end">
              <div className={`p-3 rounded-lg border text-xs flex flex-col gap-1 ${
                darkMode ? 'bg-bg-dark/60 border-border-dark text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}>
                <span className="font-mono text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1.5">
                  <FolderKanban className="h-3.5 w-3.5 text-blue-400" />
                  Enterprise Routing Active
                </span>
                <p className="mt-1 leading-relaxed">
                  Your ticket will be categorized under <strong className="text-blue-400">{category}</strong>, initialized with a priority of <strong className="text-gray-300">Medium</strong>, and routed directly to the system queue for administrator triage and personnel assignment.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submission Actions */}
        <div className="pt-4 border-t border-gray-800/30 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onBack}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              darkMode ? 'text-text-s hover:bg-surface-dark' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-blue-500/15 transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <Save className="h-4.5 w-4.5" />
            {submitting ? 'Registering...' : 'Register Operations Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
