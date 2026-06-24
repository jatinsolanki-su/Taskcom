import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  Send, 
  Trash2, 
  MessageSquare, 
  History,
  AlertCircle,
  FileText,
  CheckCircle,
  RefreshCw,
  Lock,
  Shield,
  Eye
} from 'lucide-react';
import { Ticket, Comment, TicketActivity, User as UserType } from '../types.ts';
import { api } from '../api.ts';

interface TicketDetailViewProps {
  ticketId: number;
  currentUser: UserType;
  onBack: () => void;
  onDeleteSuccess: () => void;
  darkMode: boolean;
}

export default function TicketDetailView({
  ticketId,
  currentUser,
  onBack,
  onDeleteSuccess,
  darkMode
}: TicketDetailViewProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<TicketActivity[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserType[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Input fields
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [updatingField, setUpdatingField] = useState(false);

  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const isAdmin = currentUser.role === 'Admin';
  const isReporter = ticket ? currentUser.id === ticket.reporter_id : false;
  const isAssignee = ticket ? currentUser.id === ticket.assignee_id : false;
  const canChangePriority = isAdmin;
  const canChangeAssignee = isAdmin;
  const canChangeStatusGeneral = isAdmin || isAssignee;
  const canCloseOrReopenAsOwner = isReporter && !isAdmin && !isAssignee;

  // Load ticket details on mount or ID change
  const loadTicketDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTicketById(ticketId);
      setTicket(data.ticket);
      setComments(data.comments);
      setActivities(data.activities);

      // Fetch team members for assignment options
      const team = await api.getUsers();
      setTeamMembers(team);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve ticket records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicketDetails();
  }, [ticketId]);

  // Handle comments submission
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !ticket) return;

    try {
      setPostingComment(true);
      const added = await api.addComment(ticket.id, newComment.trim());
      setComments(prev => [...prev, added]);
      setNewComment('');
      showToast('Response successfully added to discussion.', 'success');
      
      // Refresh activities to include 'COMMENT_ADDED' timeline event
      const freshData = await api.getTicketById(ticket.id);
      setActivities(freshData.activities);
    } catch (err: any) {
      showToast(err.message || 'Failed to post comment', 'error');
    } finally {
      setPostingComment(false);
    }
  };

  // Handle immediate dropdown updates (Status, Priority, Assignee)
  const handleUpdateField = async (field: 'status' | 'priority' | 'assignee_id', value: any) => {
    if (!ticket) return;
    try {
      setUpdatingField(true);
      const payload: any = {};
      payload[field] = value === '' ? null : value;
      
      const updated = await api.updateTicket(ticket.id, payload);
      setTicket(updated);
      
      // Provide detailed success feedback toast
      if (field === 'status') {
        showToast(`Ticket status successfully transitioned to "${value}".`, 'success');
      } else if (field === 'priority') {
        showToast(`Ticket priority levels set to "${value}".`, 'success');
      } else if (field === 'assignee_id') {
        const assignedUser = teamMembers.find(t => t.id === parseInt(value));
        const label = assignedUser ? assignedUser.name : 'Unassigned Sandbox Queue';
        showToast(`Ticket successfully assigned to: ${label}.`, 'success');
      }
      
      // Reload timeline and details to capture changes
      const freshData = await api.getTicketById(ticket.id);
      setActivities(freshData.activities);
    } catch (err: any) {
      showToast(err.message || 'Failed to update field', 'error');
    } finally {
      setUpdatingField(false);
    }
  };

  // Handle ticket deletion
  const handleDeleteTicket = async () => {
    if (!ticket) return;
    if (!window.confirm(`Warning: Are you absolutely sure you want to permanently delete ticket #${ticket.id}: "${ticket.title}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await api.deleteTicket(ticket.id);
      onDeleteSuccess();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete ticket', 'error');
      setLoading(false);
    }
  };

  if (loading && !ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-400">Loading comprehensive ticket details...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className={`p-6 rounded-xl border text-center ${darkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-100'}`}>
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Operational Access Failure</h3>
        <p className="text-sm text-gray-400 mt-1">{error || 'Ticket record is inaccessible.'}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-semibold"
        >
          Return to Workspace
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Detail View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800/30">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={`p-2 rounded-lg border transition-colors ${
              darkMode ? 'hover:bg-gray-800 border-gray-800 text-gray-400' : 'hover:bg-gray-50 border-gray-200 text-gray-600'
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <span className="text-xs font-mono text-gray-500 block">TICKET MANAGER / ID #{ticket.id}</span>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-950'}`}>
                {ticket.title}
              </h1>
              {ticket.category && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider uppercase border ${
                  darkMode 
                    ? 'bg-blue-950/40 text-blue-400 border-blue-900/50' 
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {ticket.category}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Admin Delete Action */}
        {isAdmin && (
          <button
            onClick={handleDeleteTicket}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 text-red-400 border border-red-500/20 hover:bg-red-600 hover:text-white rounded-lg text-xs font-semibold transition-all"
          >
            <Trash2 className="h-4 w-4" />
            Delete Ticket
          </button>
        )}
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Columns (Details and Comments) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Description Card */}
          <div className={`p-6 rounded-xl border ${
            darkMode ? 'bg-surface-dark border-border-dark' : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-4 font-mono">
              <FileText className="h-4 w-4 text-gray-400" />
              Operational Log Description
            </h2>
            <div className={`text-sm leading-relaxed whitespace-pre-line ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
              {ticket.description}
            </div>

            {/* Reporter Footnote */}
            <div className="mt-6 pt-4 border-t border-gray-800/30 flex justify-between text-xs text-gray-400 font-mono">
              <span>Opened by: <strong>{ticket.reporter_name}</strong></span>
              <span>Opened at: {new Date(ticket.created_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Collaborative Comments Block */}
          <div className={`p-6 rounded-xl border space-y-4 ${
            darkMode ? 'bg-surface-dark border-border-dark' : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-2 font-mono">
              <MessageSquare className="h-4 w-4 text-gray-400" />
              Discussion Thread ({comments.length})
            </h3>

            {/* List of comments */}
            {comments.length === 0 ? (
              <p className="text-xs text-gray-500 italic py-4">No discussions have been recorded on this ticket yet.</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2 divide-y divide-gray-800/10">
                {comments.map((c, idx) => (
                  <div key={c.id} className={`text-sm pt-4 ${idx === 0 ? 'pt-0' : ''}`}>
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="font-semibold text-gray-400 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-blue-500" />
                        {c.user_name}
                        <span className="text-[10px] bg-bg-dark text-text-s px-1.5 py-0.5 rounded-full uppercase scale-90">
                          {c.user_role}
                        </span>
                      </span>
                      <span className="text-gray-500">
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className={`pl-5 mt-1 leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{c.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Post Comment Form */}
            <form onSubmit={handlePostComment} className="pt-4 border-t border-gray-800/30">
              <div className="relative">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Post an operational response or instructions..."
                  rows={3}
                  className={`w-full p-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue ${
                    darkMode 
                      ? 'bg-bg-dark border-border-dark text-text-p placeholder-gray-500' 
                      : 'bg-gray-50 border-gray-200 text-gray-950 placeholder-gray-400'
                  }`}
                />
                <button
                  type="submit"
                  disabled={postingComment || !newComment.trim()}
                  className="absolute bottom-3 right-3 flex items-center justify-center p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (Controls Sidebar and Activities Timeline) */}
        <div className="space-y-6">
          {/* Controls Box */}
          <div className={`p-6 rounded-xl border ${
            darkMode ? 'bg-surface-dark border-border-dark' : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 font-mono">
              Operational Status Panel
            </h3>

            <div className="space-y-4">
              {/* Field 1: Status selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-400 uppercase font-mono">Transition Status</label>
                {canChangeStatusGeneral ? (
                  <>
                    <select
                      value={ticket.status}
                      onChange={(e) => handleUpdateField('status', e.target.value)}
                      disabled={updatingField}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue ${
                        darkMode 
                          ? 'bg-bg-dark border-border-dark text-text-p' 
                          : 'bg-white border-gray-200 text-gray-900'
                      }`}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Review">Review</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                    <div className="text-[10px] text-emerald-500 font-mono flex items-center gap-1.5 mt-1">
                      <Shield className="h-3 w-3" />
                      {isAdmin ? 'Administrator override active' : 'You are assigned to this ticket'}
                    </div>
                  </>
                ) : canCloseOrReopenAsOwner ? (
                  <div className="space-y-2">
                    {/* Read-only status value */}
                    <div className={`px-3 py-2 border rounded-lg text-sm flex items-center justify-between ${
                      darkMode ? 'bg-bg-dark/40 border-border-dark/60 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-700'
                    }`}>
                      <span className="flex items-center gap-1.5 font-semibold">
                        <span className={`h-2 w-2 rounded-full ${
                          ticket.status === 'Closed' ? 'bg-red-500' :
                          ticket.status === 'Resolved' ? 'bg-emerald-500' : 'bg-blue-500'
                        }`} />
                        {ticket.status}
                      </span>
                      <span className="text-[10px] font-mono uppercase bg-yellow-500/10 px-1.5 py-0.5 rounded text-yellow-500 font-bold">
                        Owner View
                      </span>
                    </div>

                    {/* Action button */}
                    {ticket.status !== 'Closed' ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateField('status', 'Closed')}
                        disabled={updatingField}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-neutral-900 border border-amber-500/20 rounded-lg text-xs font-semibold font-mono transition-all duration-200"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Close My Ticket
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateField('status', 'Open')}
                        disabled={updatingField}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-500/10 hover:bg-blue-50 text-blue-400 hover:text-neutral-900 border border-blue-500/20 rounded-lg text-xs font-semibold font-mono transition-all duration-200"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reopen My Ticket
                      </button>
                    )}
                    <span className="block text-[10px] text-gray-500 italic">
                      Ticket Owner: You can close or reopen your own ticket.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className={`px-3 py-2 border rounded-lg text-sm flex items-center justify-between ${
                      darkMode ? 'bg-bg-dark/40 border-border-dark/60 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-500'
                    }`}>
                      <span className="flex items-center gap-1.5 font-semibold">
                        <span className="h-2 w-2 rounded-full bg-gray-500" />
                        {ticket.status}
                      </span>
                      <span className="text-[10px] font-mono uppercase bg-gray-500/10 px-1.5 py-0.5 rounded text-gray-500">
                        View Only
                      </span>
                    </div>
                    <span className="text-[10px] text-red-400/90 font-mono flex items-center gap-1 mt-1">
                      <Lock className="h-3 w-3" />
                      Only assigned personnel can update status
                    </span>
                  </div>
                )}
              </div>

              {/* Field 2: Priority selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-400 uppercase font-mono">Set Priority Level</label>
                {canChangePriority ? (
                  <>
                    <select
                      value={ticket.priority}
                      onChange={(e) => handleUpdateField('priority', e.target.value)}
                      disabled={updatingField}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue ${
                        darkMode 
                          ? 'bg-bg-dark border-border-dark text-text-p' 
                          : 'bg-white border-gray-200 text-gray-900'
                      }`}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                    <div className="text-[10px] text-emerald-500 font-mono flex items-center gap-1.5 mt-1">
                      <Shield className="h-3 w-3" />
                      Admin privilege enabled
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <div className={`px-3 py-2 border rounded-lg text-sm flex items-center justify-between ${
                      darkMode ? 'bg-bg-dark/40 border-border-dark/60 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-500'
                    }`}>
                      <span className="flex items-center gap-1.5 font-semibold">
                        <span className={`h-2 w-2 rounded-full ${
                          ticket.priority === 'Critical' ? 'bg-red-500' :
                          ticket.priority === 'High' ? 'bg-amber-500' :
                          ticket.priority === 'Medium' ? 'bg-blue-500' : 'bg-gray-400'
                        }`} />
                        {ticket.priority}
                      </span>
                      <span className="text-[10px] font-mono uppercase bg-gray-500/10 px-1.5 py-0.5 rounded text-gray-500 font-bold">
                        Locked
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1 mt-1">
                      <Lock className="h-3 w-3" />
                      Only admins can change priority
                    </span>
                  </div>
                )}
              </div>

              {/* Field 3: Assignee selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-400 uppercase font-mono">Assign Personnel</label>
                {canChangeAssignee ? (
                  <>
                    <select
                      value={ticket.assignee_id || ''}
                      onChange={(e) => handleUpdateField('assignee_id', e.target.value)}
                      disabled={updatingField}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue ${
                        darkMode 
                          ? 'bg-bg-dark border-border-dark text-text-p' 
                          : 'bg-white border-gray-200 text-gray-900'
                      }`}
                    >
                      <option value="">Unassigned / Sandbox Queue</option>
                      {teamMembers.map(tm => (
                        <option key={tm.id} value={tm.id}>{tm.name} ({tm.role})</option>
                      ))}
                    </select>
                    <div className="text-[10px] text-emerald-500 font-mono flex items-center gap-1.5 mt-1">
                      <Shield className="h-3 w-3" />
                      Admin assignment controls
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <div className={`px-3 py-2 border rounded-lg text-sm flex items-center justify-between ${
                      darkMode ? 'bg-bg-dark/40 border-border-dark/60 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-500'
                    }`}>
                      <span className="flex items-center gap-1.5 font-medium">
                        <User className="h-3.5 w-3.5 text-gray-500" />
                        {ticket.assignee_name || 'Unassigned Queue'}
                      </span>
                      <span className="text-[10px] font-mono uppercase bg-gray-500/10 px-1.5 py-0.5 rounded text-gray-500 font-bold">
                        View Only
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1 mt-1">
                      <Lock className="h-3 w-3" />
                      Only admins can reassign tickets
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chronological Activity Timeline */}
          <div className={`p-6 rounded-xl border ${
            darkMode ? 'bg-surface-dark border-border-dark' : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-4 font-mono">
              <History className="h-4 w-4 text-gray-400" />
              Activity Audit log
            </h3>

            {activities.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No audit records yet.</p>
            ) : (
              <div className="relative border-l border-border-dark ml-2.5 pl-4 space-y-5 max-h-72 overflow-y-auto pr-1">
                {activities.map(act => (
                  <div key={act.id} className="relative text-xs">
                    {/* Tiny circle indicator */}
                    <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-blue-500 border border-black" />
                    
                    <div className="flex justify-between text-gray-500 font-mono">
                      <span>{act.user_name}</span>
                      <span>{new Date(act.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <p className={`mt-0.5 font-medium leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{act.description}</p>
                    
                    {/* State change indicators */}
                    {(act.old_value || act.new_value) && (
                      <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] text-text-s bg-bg-dark/40 px-2 py-0.5 rounded w-max border border-border-dark/20">
                        <span className="line-through">{act.old_value || 'None'}</span>
                        <span>→</span>
                        <span className="text-blue-400 font-bold">{act.new_value || 'None'}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Absolute Toast Component */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-xl border text-xs font-mono tracking-wide ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-emerald-400 animate-pulse" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400 animate-pulse" />
          )}
          <span>{toast.message}</span>
        </motion.div>
      )}
    </div>
  );
}
