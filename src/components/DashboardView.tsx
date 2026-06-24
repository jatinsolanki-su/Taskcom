import React from 'react';
import { motion } from 'motion/react';
import { 
  FolderOpen, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Inbox
} from 'lucide-react';
import { Ticket, User } from '../types.ts';

interface DashboardViewProps {
  tickets: Ticket[];
  currentUser: User;
  onNavigate: (page: string) => void;
  onSelectTicket: (id: number) => void;
  darkMode: boolean;
}

export default function DashboardView({
  tickets,
  currentUser,
  onNavigate,
  onSelectTicket,
  darkMode
}: DashboardViewProps) {
  // Compute analytics from REAL API tickets
  const total = tickets.length;
  const open = tickets.filter(t => t.status === 'Open').length;
  const inProgress = tickets.filter(t => t.status === 'In Progress').length;
  const review = tickets.filter(t => t.status === 'Review').length;
  const resolved = tickets.filter(t => t.status === 'Resolved').length;
  const closed = tickets.filter(t => t.status === 'Closed').length;

  const critical = tickets.filter(t => t.priority === 'Critical').length;
  const high = tickets.filter(t => t.priority === 'High').length;

  const myTicketsCount = tickets.filter(t => t.reporter_id === currentUser.id).length;
  const assignedToMeCount = tickets.filter(t => t.assignee_id === currentUser.id).length;

  const unresolved = tickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed');
  const recentTickets = [...unresolved]
    .slice(0, 5);

  const completionRate = total > 0 
    ? Math.round(((resolved + closed) / total) * 100) 
    : 0;

  // Staggered lists variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Hero Grid */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-text-p' : 'text-gray-900'}`}>
            Enterprise Operations Center
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time operations breakdown, unresolved issue trackers, and team assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('create-ticket')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-blue-500/10 transition-colors"
          >
            Create Ticket
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Metric 1 */}
        <motion.div
          variants={itemVariants}
          className={`p-6 rounded-xl border flex flex-col justify-between h-36 transition-shadow ${
            darkMode ? 'bg-surface-dark border-border-dark shadow-black/10' : 'bg-white border-gray-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Unresolved Issues</span>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-3xl font-bold ${darkMode ? 'text-text-p' : 'text-gray-950'}`}>
              {unresolved.length}
            </h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              Active queues: <span className="font-semibold text-amber-500">{open} Open</span>, <span className="font-semibold text-blue-400">{inProgress} In Progress</span>
            </p>
          </div>
        </motion.div>

        {/* Metric 2 */}
        <motion.div
          variants={itemVariants}
          className={`p-6 rounded-xl border flex flex-col justify-between h-36 transition-shadow ${
            darkMode ? 'bg-surface-dark border-border-dark shadow-black/10' : 'bg-white border-gray-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Assigned to Me</span>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
              <Inbox className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-3xl font-bold ${darkMode ? 'text-text-p' : 'text-gray-950'}`}>
              {assignedToMeCount}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Tickets designated for your immediate action.
            </p>
          </div>
        </motion.div>

        {/* Metric 3 */}
        <motion.div
          variants={itemVariants}
          className={`p-6 rounded-xl border flex flex-col justify-between h-36 transition-shadow ${
            darkMode ? 'bg-surface-dark border-border-dark shadow-black/10' : 'bg-white border-gray-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Critical & High</span>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}>
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-3xl font-bold ${darkMode ? 'text-text-p' : 'text-gray-950'}`}>
              {critical + high}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Escalated tasks requiring top-tier intervention.
            </p>
          </div>
        </motion.div>

        {/* Metric 4 */}
        <motion.div
          variants={itemVariants}
          className={`p-6 rounded-xl border flex flex-col justify-between h-36 transition-shadow ${
            darkMode ? 'bg-surface-dark border-border-dark shadow-black/10' : 'bg-white border-gray-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Resolve Percentage</span>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
              <CheckCircle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-3xl font-bold ${darkMode ? 'text-text-p' : 'text-gray-950'}`}>
              {completionRate}%
            </h3>
            <div className="w-full bg-gray-700/30 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-1.5 rounded-full" 
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Two-Column Grid: Left (Recent active tickets queue), Right (Faceted queues list) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Unresolved Tickets Table */}
        <div className={`lg:col-span-2 p-6 rounded-xl border ${
          darkMode ? 'bg-surface-dark border-border-dark shadow-black/5' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between pb-4 border-b border-gray-800/50 mb-4">
            <div>
              <h2 className={`font-semibold text-base ${darkMode ? 'text-text-p' : 'text-gray-900'}`}>
                Active Work Queue
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Top unresolved tickets currently in escalation queues.
              </p>
            </div>
            <button
              onClick={() => onNavigate('team-tickets')}
              className="text-xs font-medium text-blue-500 hover:text-blue-400 flex items-center gap-1 hover:underline"
            >
              See all team workspace
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {recentTickets.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-10 w-10 text-gray-600 mx-auto mb-3" />
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Queue is completely clear! No unresolved tickets.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800/30 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="pb-3 pl-2">Ticket ID</th>
                    <th className="pb-3">Title</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Priority</th>
                    <th className="pb-3 text-right pr-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/20">
                  {recentTickets.map(t => (
                    <tr 
                      key={t.id}
                      className={`text-sm group hover:bg-gray-800/10 cursor-pointer ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                      onClick={() => onSelectTicket(t.id)}
                    >
                      <td className="py-3.5 pl-2 font-mono text-xs text-gray-500">
                        #{t.id}
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className={`font-medium group-hover:text-blue-400 transition-colors block max-w-xs truncate ${
                          darkMode ? 'text-text-p' : 'text-gray-950'
                        }`}>
                          {t.title}
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-0.5 font-mono">
                          Assignee: {t.assignee_name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                          t.status === 'Open' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          t.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          t.status === 'Review' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                          t.priority === 'Critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20 font-bold' :
                          t.priority === 'High' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                          t.priority === 'Medium' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTicket(t.id);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold bg-gray-800 text-gray-300 hover:text-white rounded-md border border-gray-700/80 transition-all hover:bg-gray-700/80"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Faceted statistics breakdown */}
        <div className={`p-6 rounded-xl border ${
          darkMode ? 'bg-surface-dark border-border-dark shadow-black/5' : 'bg-white border-gray-200'
        }`}>
          <h2 className={`font-semibold text-base mb-4 ${darkMode ? 'text-text-p' : 'text-gray-900'}`}>
            Queues Breakdown
          </h2>

          <div className="space-y-4">
            {/* Break 1 */}
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-gray-400 mb-1.5">
                <span>Open Queue</span>
                <span className="font-mono">{open} ({total > 0 ? Math.round(open/total * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-700/20 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${total > 0 ? (open/total * 100) : 0}%` }} />
              </div>
            </div>

            {/* Break 2 */}
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-gray-400 mb-1.5">
                <span>In Progress Queue</span>
                <span className="font-mono">{inProgress} ({total > 0 ? Math.round(inProgress/total * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-700/20 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${total > 0 ? (inProgress/total * 100) : 0}%` }} />
              </div>
            </div>

            {/* Break 3 */}
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-gray-400 mb-1.5">
                <span>In Peer Review</span>
                <span className="font-mono">{review} ({total > 0 ? Math.round(review/total * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-700/20 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${total > 0 ? (review/total * 100) : 0}%` }} />
              </div>
            </div>

            {/* Break 4 */}
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-gray-400 mb-1.5">
                <span>Resolved & Closed</span>
                <span className="font-mono">{resolved + closed} ({total > 0 ? Math.round((resolved + closed)/total * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-700/20 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${total > 0 ? ((resolved + closed)/total * 100) : 0}%` }} />
              </div>
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className={`mt-6 p-4 rounded-lg border text-xs leading-relaxed space-y-2 ${
            darkMode ? 'bg-bg-dark/40 border-border-dark text-text-s' : 'bg-gray-50 border-gray-100 text-gray-600'
          }`}>
            <div className="flex justify-between">
              <span>My Authored Tickets:</span>
              <strong className={darkMode ? 'text-text-p' : 'text-gray-900'}>{myTicketsCount}</strong>
            </div>
            <div className="flex justify-between">
              <span>Unassigned tickets:</span>
              <strong className={darkMode ? 'text-text-p' : 'text-gray-900'}>{tickets.filter(t => !t.assignee_id).length}</strong>
            </div>
            <div className="flex justify-between">
              <span>Average resolve state:</span>
              <strong className="text-emerald-500 font-bold">Stable</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
