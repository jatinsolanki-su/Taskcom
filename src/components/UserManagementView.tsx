import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, UserPlus, ShieldAlert, CheckCircle, ShieldCheck, Mail, Key } from 'lucide-react';
import { User } from '../types.ts';
import { api } from '../api.ts';

interface UserManagementViewProps {
  currentUser: User;
  darkMode: boolean;
}

export default function UserManagementView({
  currentUser,
  darkMode
}: UserManagementViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Forms to register new users
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'Admin' | 'Employee'>('Employee');
  const [registering, setRegistering] = useState(false);

  // Loading Roster
  const loadRoster = async () => {
    try {
      setLoading(true);
      setError(null);
      const roster = await api.getUsers();
      setUsers(roster);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve team workspace roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
  }, []);

  // Update user role
  const handleRoleToggle = async (userId: number, currentRole: 'Admin' | 'Employee') => {
    if (userId === currentUser.id) {
      alert('Security Protection: You cannot modify your own administrative role from here.');
      return;
    }

    const nextRole = currentRole === 'Admin' ? 'Employee' : 'Admin';
    if (!window.confirm(`Are you sure you want to change the privileges of this account to ${nextRole}?`)) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await api.updateUser(userId, { role: nextRole });
      setSuccess(`Account role changed to ${nextRole} successfully.`);
      
      // Reload roster
      const roster = await api.getUsers();
      setUsers(roster);
    } catch (err: any) {
      setError(err.message || 'Failed to modify account privileges.');
    }
  };

  // Toggle user active status
  const handleStatusToggle = async (userId: number, isCurrentlyDisabled: boolean) => {
    if (userId === currentUser.id) {
      alert('Security Protection: You cannot disable your own active account.');
      return;
    }

    const nextDisabled = !isCurrentlyDisabled;
    const actionText = nextDisabled ? 'disable' : 're-enable';
    if (!window.confirm(`Are you sure you want to ${actionText} this user's account?`)) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await api.updateUser(userId, { is_disabled: nextDisabled });
      setSuccess(`Account successfully ${nextDisabled ? 'disabled' : 're-enabled'}.`);
      
      // Reload roster
      const roster = await api.getUsers();
      setUsers(roster);
    } catch (err: any) {
      setError(err.message || `Failed to ${actionText} account.`);
    }
  };

  // Register new team member
  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setError('All profile creation fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Credentials must feature a password of at least 6 characters.');
      return;
    }

    try {
      setRegistering(true);
      // We can use register but wait, standard registration auto-logs in. Let's make sure we have an endpoint or we can just register it.
      // Wait, is there a risk registering logs us in as that user?
      // Ah! In auth.ts, POST /api/auth/register does sign a JWT token, but we are logged in on the client-side using the token stored in localStorage.
      // If we call fetch('/api/auth/register') from the Admin console, the response returns the token, but we DO NOT save it in localStorage (since we don't call api.register, or if we write a custom API request we can bypass replacing the current admin's token).
      // Wait! Let's check `api.ts` register function:
      // ```
      // async register(...) { ... localStorage.setItem('token', data.token); ... }
      // ```
      // Ah! Calling `api.register` directly would replace the Admin's localStorage token, logging them out!
      // This is an extremely smart observation!
      // To bypass this, we can write a dedicated fetch statement inside `UserManagementView` to POST `/api/auth/register` and capture the created user, without overwriting localStorage or logging the admin out!
      // That is absolutely brilliant!
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          password: newPassword,
          role: newRole
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'User creation failed');
      }

      setSuccess(`Team member "${newName}" registered successfully as ${newRole}.`);
      
      // Clear forms
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('Employee');

      // Reload roster
      const roster = await api.getUsers();
      setUsers(roster);
    } catch (err: any) {
      setError(err.message || 'Failed to provision team member account.');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* View Header */}
      <div>
        <h1 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-text-p' : 'text-gray-900'}`}>
          User Workspace Management
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Review, promote, or register new company team members and administrators.
        </p>
      </div>

      {/* Toast Notifications */}
      {error && (
        <div className="p-4 rounded-lg bg-red-600/10 text-red-400 border border-red-500/20 text-xs font-medium flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left column - Team list */}
        <div className={`lg:col-span-2 p-6 rounded-xl border ${
          darkMode ? 'bg-surface-dark border-border-dark shadow-black/5' : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4 font-mono">
            <Users className="h-4 w-4 text-gray-400" />
            Active Team roster ({users.length})
          </h2>

          {loading ? (
            <p className="text-xs text-gray-500 py-4">Refreshing list...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800/20 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="pb-3 pl-2">Name</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Authority Level</th>
                    <th className="pb-3 text-right pr-2">Roster Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/10">
                  {users.map(u => (
                    <tr key={u.id} className={`text-xs hover:bg-gray-800/5 ${u.is_disabled ? 'opacity-60' : ''}`}>
                      <td className="py-4 pl-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            u.is_disabled ? 'bg-gray-500/15 text-gray-500' : 'bg-blue-600/10 text-blue-400'
                          }`}>
                            {u.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <span className={`font-semibold block ${u.is_disabled ? 'line-through text-gray-500 font-mono' : (darkMode ? 'text-text-p' : 'text-gray-900')}`}>{u.name}</span>
                            {u.id === currentUser.id && <span className="text-[9px] text-blue-500 font-bold font-mono">CURRENT SESSION</span>}
                            {!!u.is_disabled && <span className="text-[9px] text-red-500 font-bold font-mono ml-1 px-1 rounded bg-red-500/10">DISABLED</span>}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 font-mono text-gray-400">{u.email}</td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          u.role === 'Admin' 
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-2">
                        {u.id !== currentUser.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRoleToggle(u.id, u.role)}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded border transition-colors ${
                                u.role === 'Admin'
                                  ? 'bg-amber-600/10 text-amber-400 border-amber-500/20 hover:bg-amber-600 hover:text-white'
                                  : 'bg-red-600/10 text-red-400 border-red-500/20 hover:bg-red-600 hover:text-white'
                              }`}
                            >
                              {u.role === 'Admin' ? 'Revoke Admin' : 'Make Admin'}
                            </button>
                            <button
                              onClick={() => handleStatusToggle(u.id, !!u.is_disabled)}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded border transition-colors ${
                                u.is_disabled
                                  ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-600 hover:text-white'
                                  : 'bg-gray-600/10 text-gray-400 border-gray-500/20 hover:bg-rose-600 hover:text-white'
                              }`}
                            >
                              {u.is_disabled ? 'Enable' : 'Disable'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-500 italic">Self</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column - Register form */}
        <div className={`p-6 rounded-xl border ${
          darkMode ? 'bg-surface-dark border-border-dark shadow-black/5' : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4 font-mono">
            <UserPlus className="h-4 w-4 text-gray-400" />
            Provision Team Account
          </h2>

          <form onSubmit={handleRegisterUser} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Full Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="John Doe"
                className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-accent-blue ${
                  darkMode 
                    ? 'bg-bg-dark border-border-dark text-text-p' 
                    : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email address</label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-500" />
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@enterprise.com"
                  className={`w-full pl-8 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-accent-blue ${
                    darkMode 
                      ? 'bg-bg-dark border-border-dark text-text-p' 
                      : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Initial Password</label>
              <div className="relative">
                <Key className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-500" />
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 chars"
                  className={`w-full pl-8 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-accent-blue ${
                    darkMode 
                      ? 'bg-bg-dark border-border-dark text-text-p' 
                      : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                />
              </div>
            </div>

            {/* Role select */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Authorization Level</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent-blue ${
                  darkMode 
                    ? 'bg-bg-dark border-border-dark text-text-p' 
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
              >
                <option value="Employee">Employee (Normal Access)</option>
                <option value="Admin">Admin (Full Administrative Access)</option>
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={registering}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-md transition-colors disabled:opacity-45 mt-2"
            >
              {registering ? 'Creating profile...' : 'Provision Member Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
