import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, ShieldAlert, CheckCircle, Save, Key, Mail, Edit, Sparkles } from 'lucide-react';
import { User as UserType } from '../types.ts';
import { api } from '../api.ts';
// import ProfileCard from './ProfileCard.tsx';

interface ProfileViewProps {
  currentUser: UserType;
  darkMode: boolean;
  onProfileUpdate: (updatedUser: UserType) => void;
}

export default function ProfileView({
  currentUser,
  darkMode,
  onProfileUpdate
}: ProfileViewProps) {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim() || !email.trim()) {
      setError('Name and Email cannot be empty fields.');
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        name: name.trim(),
        email: email.trim().toLowerCase()
      };
      if (password.trim() !== '') {
        if (password.length < 6) {
          setError('New security password must be at least 6 characters long.');
          setLoading(false);
          return;
        }
        payload.password = password;
      }

      const res = await api.updateUser(currentUser.id, payload);
      setSuccess(res.message || 'Profile details updated successfully!');
      setPassword(''); // Clear password field
      
      // Notify root shell to update state
      onProfileUpdate(res.user);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile records.');
    } finally {
      setLoading(false);
    }
  };

  const userHandle = email ? email.split('@')[0] : 'user';

  return (
    <div className="space-y-6 max-w-6xl w-full">
      {/* Title Header */}
      <div>
        <h1 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-text-p' : 'text-gray-900'}`}>
          Personal Profile & Identity
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Review your authorized credentials, operational logs metadata, and change password signatures.
        </p>
      </div>

      {/* Toast Notification feeds */}
      {error && (
        <div className="p-4 rounded-lg bg-red-600/10 text-red-400 border border-red-500/20 text-xs font-medium flex items-center gap-2 animate-pulse">
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

      {/* Main Grid Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Form Details Card */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className={`p-6 rounded-xl border space-y-6 ${
            darkMode ? 'bg-surface-dark border-border-dark shadow-black/5' : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-4 pb-4 border-b border-gray-800/20">
              <div className="h-14 w-14 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-indigo-500/20">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h3 className={`text-base font-semibold ${darkMode ? 'text-text-p' : 'text-gray-900'}`}>{currentUser.name}</h3>
                <span className="text-xs text-gray-400 font-mono">System Role: <strong className="text-indigo-500 uppercase">{currentUser.role}</strong></span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-2">Edit Display Name</label>
                <div className="relative">
                  <Edit className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue ${
                      darkMode 
                        ? 'bg-bg-dark border-border-dark text-text-p' 
                        : 'bg-gray-50 border-gray-200 text-gray-950'
                    }`}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-2">Primary Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue ${
                      darkMode 
                        ? 'bg-bg-dark border-border-dark text-text-p' 
                        : 'bg-gray-50 border-gray-200 text-gray-950'
                    }`}
                  />
                </div>
              </div>

              {/* Password Reset */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-2">Change Password signature (Optional)</label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to maintain current credentials"
                    className={`w-full pl-10 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue ${
                      darkMode 
                        ? 'bg-bg-dark border-border-dark text-text-p' 
                        : 'bg-gray-50 border-gray-200 text-gray-950'
                    }`}
                  />
                </div>
                <span className="text-[10px] text-gray-500 block mt-1.5 font-sans">
                  * Password changes will affect current active browser tokens across environments.
                </span>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4 border-t border-gray-800/20 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-md shadow-indigo-500/10 disabled:opacity-45"
              >
                <Save className="h-4.5 w-4.5" />
                {loading ? 'Saving Records...' : 'Save Profile details'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Holographic Interactive ProfileCard */}
        {/* <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[340px] flex flex-col items-center space-y-3">
            <span className="text-xs font-semibold text-gray-400 uppercase font-mono flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
              Live Hologram Badge
            </span>
            <ProfileCard
              name={name || currentUser.name}
              title={`${currentUser.role} Operator`}
              handle={userHandle}
              status="Authorized Active"
              contactText="Verified ID"
              avatarUrl="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400"
              iconUrl="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=400"
              grainUrl="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400"
              enableTilt={true}
              behindGlowEnabled={true}
              behindGlowColor="rgba(99, 102, 241, 0.45)"
            />
            <span className="text-[10px] text-gray-500 font-mono text-center block max-w-xs leading-relaxed">
              Hover, move your mouse, or click over the ID badge above to rotate and inspect the holographic reflection system.
            </span>
          </div>
        </div> */}
      </div>
    </div>
  );
}
