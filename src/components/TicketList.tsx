import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  SlidersHorizontal, 
  Inbox, 
  User, 
  AlertTriangle, 
  Calendar,
  X,
  Plus
} from 'lucide-react';
import { Ticket, User as UserType } from '../types.ts';

interface TicketListProps {
  tickets: Ticket[];
  currentUser: UserType;
  viewScope: 'all' | 'my' | 'assigned';
  onSelectTicket: (id: number) => void;
  onNavigate: (page: string) => void;
  darkMode: boolean;
}

export default function TicketList({
  tickets,
  currentUser,
  viewScope,
  onSelectTicket,
  onNavigate,
  darkMode
}: TicketListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'created_desc' | 'created_asc' | 'priority_desc'>('created_desc');

  // Filter based on selected scope
  const scopedTickets = useMemo(() => {
    if (viewScope === 'my') {
      return tickets.filter(t => t.reporter_id === currentUser.id);
    } else if (viewScope === 'assigned') {
      return tickets.filter(t => t.assignee_id === currentUser.id);
    }
    return tickets;
  }, [tickets, viewScope, currentUser.id]);

  // Apply search and facet filter parameters
  const filteredTickets = useMemo(() => {
    let result = [...scopedTickets];

    if (search.trim() !== '') {
      const q = search.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.id.toString().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.reporter_name && t.reporter_name.toLowerCase().includes(q)) ||
        (t.assignee_name && t.assignee_name.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'All') {
      result = result.filter(t => t.status === statusFilter);
    }

    if (priorityFilter !== 'All') {
      result = result.filter(t => t.priority === priorityFilter);
    }

    // Apply sorting
    if (sortBy === 'created_desc') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'created_asc') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === 'priority_desc') {
      const pMap: any = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      result.sort((a, b) => (pMap[b.priority] || 0) - (pMap[a.priority] || 0));
    }

    return result;
  }, [scopedTickets, search, statusFilter, priorityFilter, sortBy]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.03 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120 } }
  };

  const getScopeTitle = () => {
    if (viewScope === 'my') return 'My Authored Tickets';
    if (viewScope === 'assigned') return 'Tickets Assigned To Me';
    return 'Company Ticket Workspace';
  };

  const getScopeSub = () => {
    if (viewScope === 'my') return 'Unresolved and resolved tickets raised by you.';
    if (viewScope === 'assigned') return 'Operations delegated directly to your profile.';
    return 'All registered enterprise issues across teams and employees.';
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-text-p' : 'text-gray-900'}`}>
            {getScopeTitle()}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {getScopeSub()}
          </p>
        </div>
        <button
          onClick={() => onNavigate('create-ticket')}
          className="sm:self-center flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </button>
      </div>

      {/* Filter and Search Bar Card */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row gap-4 items-center justify-between ${
        darkMode ? 'bg-surface-dark border-border-dark shadow-black/5' : 'bg-white border-gray-200'
      }`}>
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search titles, descriptions, reporter, ID..."
            className={`w-full pl-10 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue ${
              darkMode 
                ? 'bg-bg-dark border-border-dark text-text-p placeholder-gray-500' 
                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
            }`}
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-3 text-gray-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Facet Selectors */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-2.5 py-1.5 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-accent-blue ${
                darkMode 
                  ? 'bg-bg-dark border-border-dark text-text-p' 
                  : 'bg-white border-gray-200 text-gray-700'
              }`}
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Review">Review</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
            <span>Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className={`px-2.5 py-1.5 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-accent-blue ${
                darkMode 
                  ? 'bg-bg-dark border-border-dark text-text-p' 
                  : 'bg-white border-gray-200 text-gray-700'
              }`}
            >
              <option value="All">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={`px-2.5 py-1.5 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-accent-blue ${
                darkMode 
                  ? 'bg-bg-dark border-border-dark text-text-p' 
                  : 'bg-white border-gray-200 text-gray-700'
              }`}
            >
              <option value="created_desc">Newest First</option>
              <option value="created_asc">Oldest First</option>
              <option value="priority_desc">Highest Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Database Table */}
      <div className={`rounded-xl border overflow-hidden ${
        darkMode ? 'bg-surface-dark border-border-dark shadow-black/5' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        {filteredTickets.length === 0 ? (
          <div className="text-center py-20">
            <Inbox className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className={`text-base font-semibold ${darkMode ? 'text-text-p' : 'text-gray-900'}`}>No matching tickets</h3>
            <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
              We couldn't find any issues that fit your query. Clear your filters or keyword query and try again.
            </p>
            {(search || statusFilter !== 'All' || priorityFilter !== 'All') && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('All');
                  setPriorityFilter('All');
                }}
                className="mt-4 px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800/30 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50/5 pl-2">
                  <th className="py-4 pl-4 w-24">ID</th>
                  <th className="py-4">Ticket details</th>
                  <th className="py-4 w-32">Status</th>
                  <th className="py-4 w-32">Priority</th>
                  <th className="py-4 w-44">Reporter</th>
                  <th className="py-4 w-24 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <motion.tbody 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="divide-y divide-gray-800/10"
              >
                {filteredTickets.map(t => (
                  <motion.tr
                    key={t.id}
                    variants={itemVariants}
                    className={`text-sm group hover:bg-gray-800/10 cursor-pointer ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                    onClick={() => onSelectTicket(t.id)}
                  >
                    {/* ID */}
                    <td className="py-4 pl-4 font-mono text-xs text-gray-500">
                      #{t.id}
                    </td>

                    {/* TITLE */}
                    <td className="py-4 pr-6">
                      <div className="flex flex-col">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`font-semibold group-hover:text-blue-400 transition-colors block max-w-sm sm:max-w-md truncate ${
                            darkMode ? 'text-text-p' : 'text-gray-950'
                          }`}>
                            {t.title}
                          </span>
                          {t.category && (
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono tracking-wider uppercase border shrink-0 ${
                              darkMode 
                                ? 'bg-blue-950/30 text-blue-400 border-blue-900/40' 
                                : 'bg-blue-50 text-blue-700 border-blue-100'
                            }`}>
                              {t.category}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 line-clamp-1 max-w-sm sm:max-w-md mt-1 font-sans leading-relaxed">
                          {t.description}
                        </span>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-500" />
                            {new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="h-1.5 w-1.5 bg-gray-600 rounded-full" />
                          <span>Assignee: {t.assignee_name || 'Unassigned'}</span>
                        </div>
                      </div>
                    </td>

                    {/* STATUS */}
                    <td className="py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                        t.status === 'Open' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        t.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        t.status === 'Review' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        t.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}>
                        {t.status}
                      </span>
                    </td>

                    {/* PRIORITY */}
                    <td className="py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                        t.priority === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20 font-extrabold shadow-sm shadow-red-500/5' :
                        t.priority === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        t.priority === 'Medium' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}>
                        {t.priority}
                      </span>
                    </td>

                    {/* REPORTER */}
                    <td className="py-4 text-xs text-gray-400 truncate">
                      <div className="flex flex-col">
                        <span className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                          {t.reporter_name}
                        </span>
                        <span className="text-[10px] text-gray-500 mt-0.5 font-mono">
                          {t.reporter_email}
                        </span>
                      </div>
                    </td>

                    {/* ACTION */}
                    <td className="py-4 text-right pr-4" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectTicket(t.id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-gray-800 text-gray-300 hover:text-white rounded-md border border-gray-700/80 transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
