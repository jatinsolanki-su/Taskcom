import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Menu, 
  X, 
  ChevronRight, 
  Lock, 
  Key, 
  UserPlus, 
  Layers, 
  ShieldAlert, 
  CheckCircle,
  Clock,
  ExternalLink,
  LifeBuoy
} from 'lucide-react';

import { User, Ticket, Notification } from './types.ts';
import { api } from './api.ts';

// Components
import Sidebar from './components/Sidebar.tsx';
import DashboardView from './components/DashboardView.tsx';
import TicketList from './components/TicketList.tsx';
import TicketDetailView from './components/TicketDetailView.tsx';
import CreateTicketView from './components/CreateTicketView.tsx';
import UserManagementView from './components/UserManagementView.tsx';
import ProfileView from './components/ProfileView.tsx';
import SettingsView from './components/SettingsView.tsx';
import NotificationsView from './components/NotificationsView.tsx';

// OGL Components
import GooeyNav from './components/GooeyNav.tsx';
import Prism from './components/Prism.tsx';

export default function App() {
  // Global States
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  
  // Navigation: 'landing' | 'login' | 'register' | 'forgot' | 'reset'
  // Private Pages: 'dashboard' | 'my-tickets' | 'assigned-tickets' | 'team-tickets' | 'create-ticket' | 'ticket-details' | 'user-management' | 'profile' | 'settings' | 'notifications'
  const [currentPage, setCurrentPage] = useState<string>(() => {
    const activeToken = localStorage.getItem('token');
    return activeToken ? 'dashboard' : 'landing';
  });

  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === null ? true : saved === 'true'; // Default to gorgeous dark mode
  });

  // Data Stores
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(false);

  // Authentication Fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');

  // Sandbox Notification Helpers
  const [sandboxResetToken, setSandboxResetToken] = useState<string | null>(null);

  // Alert Feed
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Sync state if localStorage changes or trigger custom token status
  useEffect(() => {
    const handleAuthChange = () => {
      const activeToken = localStorage.getItem('token');
      const activeUser = localStorage.getItem('user');
      setToken(activeToken);
      setCurrentUser(activeUser ? JSON.parse(activeUser) : null);
      if (!activeToken) {
        setCurrentPage(prev => {
          const publicPages = ['landing', 'login', 'register', 'forgot', 'reset'];
          if (publicPages.includes(prev)) {
            return prev;
          }
          return 'landing';
        });
      }
    };

    window.addEventListener('auth-status-change', handleAuthChange);
    return () => window.removeEventListener('auth-status-change', handleAuthChange);
  }, []);

  // Fetch Tickets and Notifications if logged in
  const fetchUserData = async () => {
    if (!token || !currentUser) return;
    try {
      setLoadingTickets(true);
      const list = await api.getTickets();
      setTickets(list);

      const notifs = await api.getNotifications();
      setNotifications(notifs);
      setUnreadNotifCount(notifs.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Failed to sync backend user data:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    
    // Set up brief polling intervals for active logs/notifications
    let interval: any;
    if (token) {
      interval = setInterval(() => {
        api.getNotifications()
          .then(notifs => {
            setNotifications(notifs);
            setUnreadNotifCount(notifs.filter(n => !n.is_read).length);
          })
          .catch(() => {});
      }, 10000); // 10 seconds refresh
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [token, currentUser?.id]);

  // Handle Logout
  const handleLogout = () => {
    api.logout();
    setTickets([]);
    setNotifications([]);
    setUnreadNotifCount(0);
    setCurrentPage('landing');
  };

  // Authentications: LOGIN
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setAuthSuccess(null);
    
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please fill in all email and password fields.');
      return;
    }

    try {
      setAuthLoading(true);
      const res = await api.login(loginEmail.trim(), loginPassword);
      setCurrentUser(res.user);
      setToken(res.token);
      setCurrentPage('dashboard');
      
      // Clear forms
      setLoginEmail('');
      setLoginPassword('');
    } catch (err: any) {
      setLoginError(err.message || 'Authentication credentials rejected.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Authentications: REGISTER
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setAuthSuccess(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setRegisterError('All profile credentials are required.');
      return;
    }

    if (regPassword.length < 6) {
      setRegisterError('Your security password must contain at least 6 characters.');
      return;
    }

    try {
      setAuthLoading(true);
      const res = await api.register(regName.trim(), regEmail.trim(), regPassword);
      setCurrentUser(res.user);
      setToken(res.token);
      setCurrentPage('dashboard');

      // Clear forms
      setRegName('');
      setRegEmail('');
      setRegPassword('');
    } catch (err: any) {
      setRegisterError(err.message || 'Failed to complete registration.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Authentications: FORGOT PASSWORD
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setAuthSuccess(null);
    setSandboxResetToken(null);

    if (!forgotEmail.trim()) {
      setForgotError('Please provide your registered account email.');
      return;
    }

    try {
      setAuthLoading(true);
      const res = await api.forgotPassword(forgotEmail.trim());
      setAuthSuccess(res.message);
      
      // Sandbox: Display token on screen if available for direct reset testing!
      if (res.resetToken) {
        setSandboxResetToken(res.resetToken);
      }
    } catch (err: any) {
      setForgotError(err.message || 'Could not verify email identity.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Authentications: RESET PASSWORD
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setAuthSuccess(null);

    if (!resetToken.trim() || !resetPassword.trim()) {
      setResetError('Reset token and new password are required fields.');
      return;
    }

    if (resetPassword.length < 6) {
      setResetError('New password must contain at least 6 characters.');
      return;
    }

    try {
      setAuthLoading(true);
      const res = await api.resetPassword(resetToken.trim(), resetPassword);
      setAuthSuccess(res.message + ' Navigating to login...');
      
      setTimeout(() => {
        setAuthSuccess(null);
        setCurrentPage('login');
      }, 2000);
    } catch (err: any) {
      setResetError(err.message || 'Failed to complete password reset.');
    } finally {
      setAuthLoading(false);
    }
  };

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('darkMode', String(next));
  };

  const handleMarkNotificationsAsRead = async () => {
    try {
      await api.markNotificationsAsRead();
      const list = await api.getNotifications();
      setNotifications(list);
      setUnreadNotifCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  // Route Views Renderer
  const renderPrivatePage = () => {
    if (!currentUser) return null;

    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardView
            tickets={tickets}
            currentUser={currentUser}
            onNavigate={(page) => setCurrentPage(page)}
            onSelectTicket={(id) => {
              setSelectedTicketId(id);
              setCurrentPage('ticket-details');
            }}
            darkMode={darkMode}
          />
        );
      case 'my-tickets':
        return (
          <TicketList
            tickets={tickets}
            currentUser={currentUser}
            viewScope="my"
            onSelectTicket={(id) => {
              setSelectedTicketId(id);
              setCurrentPage('ticket-details');
            }}
            onNavigate={(page) => setCurrentPage(page)}
            darkMode={darkMode}
          />
        );
      case 'assigned-tickets':
        return (
          <TicketList
            tickets={tickets}
            currentUser={currentUser}
            viewScope="assigned"
            onSelectTicket={(id) => {
              setSelectedTicketId(id);
              setCurrentPage('ticket-details');
            }}
            onNavigate={(page) => setCurrentPage(page)}
            darkMode={darkMode}
          />
        );
      case 'team-tickets':
        return (
          <TicketList
            tickets={tickets}
            currentUser={currentUser}
            viewScope="all"
            onSelectTicket={(id) => {
              setSelectedTicketId(id);
              setCurrentPage('ticket-details');
            }}
            onNavigate={(page) => setCurrentPage(page)}
            darkMode={darkMode}
          />
        );
      case 'ticket-details':
        return selectedTicketId ? (
          <TicketDetailView
            ticketId={selectedTicketId}
            currentUser={currentUser}
            onBack={() => {
              setSelectedTicketId(null);
              setCurrentPage('team-tickets');
              fetchUserData(); // Reload list
            }}
            onDeleteSuccess={() => {
              setSelectedTicketId(null);
              setCurrentPage('team-tickets');
              fetchUserData();
            }}
            darkMode={darkMode}
          />
        ) : (
          <div className="text-center py-20 text-gray-500">No ticket is currently selected.</div>
        );
      case 'create-ticket':
        return (
          <CreateTicketView
            currentUser={currentUser!}
            onBack={() => setCurrentPage('team-tickets')}
            onSuccess={(newId) => {
              setSelectedTicketId(newId);
              setCurrentPage('ticket-details');
              fetchUserData();
            }}
            darkMode={darkMode}
          />
        );
      case 'user-management':
        return (
          <UserManagementView
            currentUser={currentUser}
            darkMode={darkMode}
          />
        );
      case 'profile':
        return (
          <ProfileView
            currentUser={currentUser}
            darkMode={darkMode}
            onProfileUpdate={(updated) => {
              setCurrentUser(updated);
              localStorage.setItem('user', JSON.stringify(updated));
            }}
          />
        );
      case 'settings':
        return (
          <SettingsView
            currentUser={currentUser}
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
          />
        );
      case 'notifications':
        return (
          <NotificationsView
            notifications={notifications}
            onMarkRead={handleMarkNotificationsAsRead}
            onSelectTicket={(id) => {
              setSelectedTicketId(id);
              setCurrentPage('ticket-details');
            }}
            darkMode={darkMode}
          />
        );
      default:
        return <div className="text-center py-20 text-gray-500">Standard operational segment unavailable.</div>;
    }
  };

  return (
    <div className={`min-h-screen font-sans ${darkMode ? 'bg-bg-dark text-text-p dark' : 'bg-[#f8f9fa] text-gray-800'}`}>
      
      {/* PUBLIC AREA ROUTING */}
      {!token && (
        <div className="min-h-screen flex flex-col relative overflow-hidden">
          
          {/* Component 2: Gradual Blur Background (Prism) */}
          <div className="absolute inset-0 z-0">
            <Prism
              height={3.8}
              baseWidth={5.8}
              scale={3.6}
              glow={0.8}
              noise={darkMode ? 0.04 : 0.02}
              transparent={true}
              timeScale={0.3}
              animationType="rotate"
            />
          </div>

          {/* Page Layout Container */}
          <div className="relative z-10 flex flex-col min-h-screen">
            
            {/* Top Menu Bar on Landing / Auth Screens */}
            <header className="flex items-center justify-between px-6 py-4 backdrop-blur-md bg-black/10 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  T
                </div>
                <span className="font-semibold tracking-wider text-white text-xs font-mono uppercase">
                  Taskcom
                </span>
              </div>

              {/* Component 1: Gooey Nav - Exactly as requested */}
              <div className="hidden sm:block">
                <GooeyNav
                  items={[
                    { label: 'Home', href: '#', onClick: (e) => { e.preventDefault(); setCurrentPage('landing'); } },
                    { label: 'Access Console', href: '#', onClick: (e) => { e.preventDefault(); setCurrentPage('login'); } },
                    { label: 'Register Account', href: '#', onClick: (e) => { e.preventDefault(); setCurrentPage('register'); } }
                  ]}
                  initialActiveIndex={currentPage === 'landing' ? 0 : currentPage === 'login' ? 1 : 2}
                  onActiveChange={(idx) => {
                    if (idx === 0) setCurrentPage('landing');
                    else if (idx === 1) setCurrentPage('login');
                    else if (idx === 2) setCurrentPage('register');
                  }}
                />
              </div>

              {/* Mobile quick navigations */}
              <div className="flex sm:hidden gap-3 text-xs">
                <button onClick={() => setCurrentPage('login')} className="text-white font-semibold">Login</button>
                <button onClick={() => setCurrentPage('register')} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded">Register</button>
              </div>
            </header>

            {/* Main Interactive Screen Segment */}
            <main className="flex-grow flex items-center justify-center px-4 py-12">
              <AnimatePresence mode="wait">
                
                {/* 1. LANDING PAGE */}
                {currentPage === 'landing' && (
                  <motion.div
                    key="landing"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-2xl text-center space-y-8 px-4"
                  >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 font-mono font-semibold uppercase tracking-wider">
                      <Layers className="h-3.5 w-3.5" />
                      v1.4 Production Ready
                    </div>

                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                      Enterprise Issue <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
                        Escalation Workspace
                      </span>
                    </h1>

                    <p className="text-sm sm:text-base text-gray-300 max-w-lg mx-auto leading-relaxed">
                      Used by global infrastructure systems and enterprise operations teams to route tickets, track historical timelines, and coordinate team resolutions.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                      <button
                        onClick={() => setCurrentPage('login')}
                        className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg shadow-blue-600/10 transition-colors flex items-center justify-center gap-1.5"
                      >
                        Launch Platform
                        <ChevronRight className="h-4.5 w-4.5" />
                      </button>
                      <button
                        onClick={() => setCurrentPage('register')}
                        className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg border border-white/10 transition-colors"
                      >
                        Provision New Account
                      </button>
                    </div>

                    {/* Features overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-12 border-t border-white/5 text-left max-w-xl mx-auto">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold font-mono text-blue-400 uppercase">1. SECURED RBAC</h4>
                        <p className="text-[11px] text-gray-400">Strict segregation between corporate managers and workspace operators.</p>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold font-mono text-purple-400 uppercase">2. AUDIT TIMELINES</h4>
                        <p className="text-[11px] text-gray-400">Chronological history audit log capture on all status transitions.</p>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold font-mono text-emerald-400 uppercase">3. COLLABORATION</h4>
                        <p className="text-[11px] text-gray-400">Real-time status metrics, notification feeds, and thread discussions.</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2. LOGIN PAGE */}
                {currentPage === 'login' && (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-md p-8 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl text-left"
                  >
                    <div className="space-y-1.5 mb-6">
                      <h2 className="text-2xl font-bold tracking-tight text-white">Console Login</h2>
                      <p className="text-xs text-gray-400">Authorize your secure operational session.</p>
                    </div>

                    {loginError && (
                      <div className="p-3 mb-4 rounded-lg bg-red-600/10 border border-red-500/20 text-xs font-medium text-red-400 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        <span>{loginError}</span>
                      </div>
                    )}

                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest font-mono mb-1.5">Roster Email</label>
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="admin@enterprise.com"
                          className="w-full px-3.5 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest font-mono">Password</label>
                          <button
                            type="button"
                            onClick={() => { setForgotError(null); setCurrentPage('forgot'); }}
                            className="text-[10px] font-semibold text-blue-400 hover:underline"
                          >
                            Reset Password?
                          </button>
                        </div>
                        <input
                          type="password"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Password"
                          className="w-full px-3.5 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-500/10 transition-colors disabled:opacity-40 mt-4"
                      >
                        {authLoading ? 'Verifying authority...' : 'Access Console'}
                      </button>
                    </form>

                    <p className="text-xs text-center text-gray-400 mt-6">
                      New to operations?{' '}
                      <button onClick={() => { setRegisterError(null); setCurrentPage('register'); }} className="text-blue-400 font-semibold hover:underline">
                        Provision Profile
                      </button>
                    </p>
                  </motion.div>
                )}

                {/* 3. REGISTER PAGE */}
                {currentPage === 'register' && (
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-md p-8 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl text-left"
                  >
                    <div className="space-y-1.5 mb-6">
                      <h2 className="text-2xl font-bold tracking-tight text-white">Create Workspace Profile</h2>
                      <p className="text-xs text-gray-400">Join the company operational roster.</p>
                    </div>

                    {registerError && (
                      <div className="p-3 mb-4 rounded-lg bg-red-600/10 border border-red-500/20 text-xs font-medium text-red-400 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        <span>{registerError}</span>
                      </div>
                    )}

                    <form onSubmit={handleRegisterSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest font-mono mb-1.5">Full Name</label>
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="Administrator / Operator Name"
                          className="w-full px-3.5 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest font-mono mb-1.5">Operational Email</label>
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="operator@enterprise.com"
                          className="w-full px-3.5 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest font-mono mb-1.5">Password Signature</label>
                        <input
                          type="password"
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="w-full px-3.5 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-500/10 transition-colors disabled:opacity-45 mt-4"
                      >
                        {authLoading ? 'Registering authority...' : 'Register Operations Account'}
                      </button>
                    </form>

                    <p className="text-xs text-center text-gray-400 mt-6">
                      Already registered?{' '}
                      <button onClick={() => { setLoginError(null); setCurrentPage('login'); }} className="text-blue-400 font-semibold hover:underline">
                        Access Console
                      </button>
                    </p>
                  </motion.div>
                )}

                {/* 4. FORGOT PASSWORD PAGE */}
                {currentPage === 'forgot' && (
                  <motion.div
                    key="forgot"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-md p-8 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl text-left"
                  >
                    <div className="space-y-1.5 mb-6">
                      <h2 className="text-2xl font-bold tracking-tight text-white">Reset Operational Password</h2>
                      <p className="text-xs text-gray-400">Request a verification hash callback.</p>
                    </div>

                    {forgotError && (
                      <div className="p-3 mb-4 rounded-lg bg-red-600/10 border border-red-500/20 text-xs font-medium text-red-400">
                        <span>{forgotError}</span>
                      </div>
                    )}
                    {authSuccess && (
                      <div className="p-3 mb-4 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 space-y-2">
                        <p>{authSuccess}</p>
                      </div>
                    )}

                    {/* Developer Sandbox Token Display (Extremely Useful!) */}
                    {sandboxResetToken && (
                      <div className="p-3.5 mb-4 rounded-lg bg-blue-600/15 border border-blue-500/20 text-xs text-blue-300 font-mono leading-relaxed">
                        <strong className="block text-white mb-1 uppercase text-[10px]">Sandbox Reset Token:</strong>
                        <span className="select-all block bg-black/30 p-1.5 rounded text-[11px] truncate">{sandboxResetToken}</span>
                        <button
                          onClick={() => {
                            setResetToken(sandboxResetToken);
                            setResetError(null);
                            setCurrentPage('reset');
                          }}
                          className="mt-2 text-[10px] font-bold text-blue-400 underline hover:text-blue-300 block"
                        >
                          Use this token to set new password now →
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleForgotSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest font-mono mb-1.5">Your Registered Email</label>
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="admin@enterprise.com"
                          className="w-full px-3.5 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-lg transition-colors disabled:opacity-45 mt-4"
                      >
                        {authLoading ? 'Verifying email...' : 'Request Reset Instructions'}
                      </button>
                    </form>

                    <div className="flex justify-between text-xs mt-6">
                      <button onClick={() => { setLoginError(null); setAuthSuccess(null); setCurrentPage('login'); }} className="text-gray-400 hover:text-white">
                        Back to Login
                      </button>
                      <button onClick={() => { setResetError(null); setAuthSuccess(null); setCurrentPage('reset'); }} className="text-blue-400 font-semibold hover:underline">
                        Enter reset token directly
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* 5. RESET PASSWORD PAGE */}
                {currentPage === 'reset' && (
                  <motion.div
                    key="reset"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-md p-8 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl text-left"
                  >
                    <div className="space-y-1.5 mb-6">
                      <h2 className="text-2xl font-bold tracking-tight text-white">Commit New Password</h2>
                      <p className="text-xs text-gray-400">Apply the verification token to finalize.</p>
                    </div>

                    {resetError && (
                      <div className="p-3 mb-4 rounded-lg bg-red-600/10 border border-red-500/20 text-xs font-medium text-red-400">
                        <span>{resetError}</span>
                      </div>
                    )}
                    {authSuccess && (
                      <div className="p-3 mb-4 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
                        <span>{authSuccess}</span>
                      </div>
                    )}

                    <form onSubmit={handleResetSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest font-mono mb-1.5">Verification Reset Token</label>
                        <input
                          type="text"
                          required
                          value={resetToken}
                          onChange={(e) => setResetToken(e.target.value)}
                          placeholder="Paste sandbox reset token here"
                          className="w-full px-3.5 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest font-mono mb-1.5">New Password Signature</label>
                        <input
                          type="password"
                          required
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="w-full px-3.5 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-lg transition-colors disabled:opacity-45 mt-4"
                      >
                        {authLoading ? 'Confirming hash...' : 'Reset operational password'}
                      </button>
                    </form>

                    <button 
                      onClick={() => { setLoginError(null); setAuthSuccess(null); setCurrentPage('login'); }}
                      className="text-xs text-center text-gray-400 mt-6 block w-full hover:text-white hover:underline"
                    >
                      Return to console login
                    </button>
                  </motion.div>
                )}

              </AnimatePresence>
            </main>

            {/* Footer logs banner */}
            <footer className="text-center py-6 text-[10px] text-gray-500 font-mono tracking-widest border-t border-white/5">
              SECURE WORKSPACE PROTOCOLS STANDBY // ENCRYPTION: SHA-256
            </footer>

          </div>
        </div>
      )}

      {/* PRIVATE AREA ROUTING (AUTHORIZED PANELS) */}
      {token && currentUser && (
        <div className="min-h-screen relative flex">
          
          {/* Side Drawer menu bar */}
          <Sidebar
            currentUser={currentUser}
            currentPage={currentPage}
            onNavigate={(page) => {
              setSelectedTicketId(null);
              setCurrentPage(page);
            }}
            unreadCount={unreadNotifCount}
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
            onLogout={handleLogout}
          />

          {/* Master Content Stage Area */}
          <div className="flex-grow min-h-screen pl-64 flex flex-col">
            
            {/* Top Operational Status bar */}
            <header className={`px-8 py-4 border-b flex items-center justify-between sticky top-0 z-20 backdrop-blur-md ${
              darkMode 
                ? 'bg-bg-dark/80 border-border-dark' 
                : 'bg-[#f8f9fa]/80 border-gray-200'
            }`}>
              {/* Dynamic Page label indicators */}
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono font-bold tracking-widest text-gray-400 uppercase">
                  OPERATIONS HOST ONLINE // PORT: 3000
                </span>
              </div>

              {/* Operations tools shortcuts */}
              <div className="flex items-center gap-4">
                {/* Search / Status badge */}
                <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded border ${
                  darkMode ? 'bg-surface-dark/40 border-border-dark text-text-s' : 'bg-gray-100 border-gray-200 text-gray-600'
                }`}>
                  USER ID: #{currentUser.id}
                </span>

                {/* Quick notifications bell widget */}
                <button
                  onClick={() => setCurrentPage('notifications')}
                  className={`p-1.5 rounded-lg border relative transition-colors ${
                    darkMode ? 'hover:bg-surface-dark border-border-dark text-text-s hover:text-text-p' : 'hover:bg-gray-50 border-gray-200 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Bell className="h-4 w-4" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-blue-500 rounded-full animate-ping" />
                  )}
                </button>
              </div>
            </header>

            {/* Inner Route Stage viewport */}
            <main className="flex-grow p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  {renderPrivatePage()}
                </motion.div>
              </AnimatePresence>
            </main>

            {/* Enterprise console footer status credits */}
            <footer className={`p-4 text-center text-[10px] font-mono tracking-widest border-t ${
              darkMode ? 'border-border-dark text-text-s/60' : 'border-gray-200 text-gray-400'
            }`}>
              ENTERPRISE TICKET STACK STANDBY // ALL RESOLUTION CHANNELS SYNTAX-OK
            </footer>

          </div>
        </div>
      )}

    </div>
  );
}
