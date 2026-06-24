import React from 'react';
import { 
  LayoutDashboard, 
  User, 
  Users, 
  Settings, 
  LogOut, 
  PlusCircle, 
  Bell, 
  FolderOpen, 
  ShieldCheck, 
  Moon, 
  Sun,
  Inbox,
  Command
} from 'lucide-react';
import { User as UserType } from '../types.ts';

interface SidebarProps {
  currentUser: UserType;
  currentPage: string;
  onNavigate: (page: string) => void;
  unreadCount: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  currentUser,
  currentPage,
  onNavigate,
  unreadCount,
  darkMode,
  onToggleDarkMode,
  onLogout
}: SidebarProps) {
  const isAdmin = currentUser.role === 'Admin';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-tickets', label: 'My Tickets', icon: Inbox },
    { id: 'assigned-tickets', label: 'Assigned', icon: FolderOpen },
    { id: 'team-tickets', label: 'Team Workspace', icon: Users },
    { id: 'create-ticket', label: 'Create Ticket', icon: PlusCircle },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    ...(isAdmin ? [{ id: 'user-management', label: 'User Management', icon: ShieldCheck }] : []),
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside className={`w-64 h-screen fixed left-0 top-0 flex flex-col justify-between border-r transition-all duration-300 z-30 ${
      darkMode 
        ? 'bg-[#0c0c0e] border-border-dark text-text-s' 
        : 'bg-white border-gray-200 text-gray-700'
    }`}>
      {/* Sidebar Top: Logo and Roster */}
      <div className="flex flex-col">
        {/* Brand Banner */}
        <div className={`p-6 border-b flex items-center justify-between ${
          darkMode ? 'border-border-dark' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/15 border border-white/10 shrink-0">
              <Command className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className={`font-bold tracking-tight text-sm block leading-none font-sans ${
                darkMode ? 'text-text-p' : 'text-gray-950'
              }`}>
                TaskCom
              </span>
              <span className="text-[10px] text-blue-500 font-mono tracking-widest font-semibold uppercase mt-1 block">
                Support Hub
              </span>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className={`p-4 mx-4 my-4 rounded-xl border flex items-center gap-3 ${
          darkMode 
            ? 'bg-surface-dark border-border-dark' 
            : 'bg-gray-50 border-gray-100'
        }`}>
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-accent-blue to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-inner">
            {currentUser.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="overflow-hidden">
            <h4 className={`text-xs font-semibold truncate leading-tight ${
              darkMode ? 'text-text-p' : 'text-gray-900'
            }`}>
              {currentUser.name}
            </h4>
            <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full inline-block mt-1 ${
              isAdmin 
                ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            }`}>
              {currentUser.role}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id || (item.id === 'assigned-tickets' && currentPage === 'assigned') || (item.id === 'my-tickets' && currentPage === 'my');
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive 
                    ? darkMode
                      ? 'bg-[#1e1e21] text-text-p border border-border-dark shadow-sm'
                      : 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100'
                    : darkMode
                      ? 'hover:bg-[#1e1e21]/50 text-text-s hover:text-text-p border border-transparent'
                      : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4.5 w-4.5 transition-colors duration-200 ${
                    isActive 
                      ? darkMode ? 'text-accent-blue' : 'text-blue-600'
                      : darkMode ? 'text-text-s/70 group-hover:text-text-p' : 'text-gray-400 group-hover:text-gray-600'
                  }`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="h-5 min-w-5 px-1.5 flex items-center justify-center text-[10px] font-bold bg-accent-blue text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer: Mode Toggle and Logout */}
      <div className={`p-4 border-t space-y-2 ${
        darkMode ? 'border-border-dark' : 'border-gray-200'
      }`}>
        {/* Toggle Dark Mode Button */}
        <button
          onClick={onToggleDarkMode}
          className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            darkMode 
              ? 'hover:bg-surface-dark text-text-s hover:text-text-p' 
              : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
          </div>
          <span className="text-[10px] text-text-s font-mono">
            {darkMode ? 'DARK' : 'LIGHT'}
          </span>
        </button>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Terminate Session</span>
        </button>
      </div>
    </aside>
  );
}
