import React from 'react';
import { motion } from 'motion/react';
import { Settings, Shield, Sliders, Info, ShieldCheck } from 'lucide-react';
import { User } from '../types.ts';

interface SettingsViewProps {
  currentUser: User;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function SettingsView({
  currentUser,
  darkMode,
  onToggleDarkMode
}: SettingsViewProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Title Header */}
      <div>
        <h1 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-text-p' : 'text-gray-900'}`}>
          System Settings & Customization
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Adjust visual themes, notification thresholds, and security specifications.
        </p>
      </div>

      {/* Main Settings Panel */}
      <div className={`p-6 rounded-xl border divide-y divide-border-dark/30 space-y-6 ${
        darkMode ? 'bg-surface-dark border-border-dark shadow-black/5' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        
        {/* Toggle Theme */}
        <div className="flex items-center justify-between py-4 first:pt-0">
          <div>
            <h3 className={`text-sm font-semibold ${darkMode ? 'text-text-p' : 'text-gray-950'}`}>Appearance Color Scheme</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              Toggle between deep operations workspace or clean, high-contrast light environments.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleDarkMode}
            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
              darkMode 
                ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/20 hover:bg-accent-blue hover:text-white' 
                : 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
            }`}
          >
            {darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          </button>
        </div>

        {/* System Details info */}
        <div className="pt-6 flex gap-4 text-xs text-gray-400 leading-relaxed">
          <Info className="h-5 w-5 shrink-0 text-blue-500" />
          <div className="space-y-1">
            <h4 className={`font-semibold ${darkMode ? 'text-text-p' : 'text-gray-950'}`}>Active Workspace Metadata</h4>
            <p><strong>Environment:</strong> Cloud Container Sandbox API Layer</p>
            <p><strong>Protocol:</strong> JSON Web Tokens (JWT) / SHA-256 Hashes</p>
            <p><strong>Database:</strong> Enterprise Relational MySQL (Single Source of Truth)</p>
            <p className="mt-2 text-[11px] italic">
              * Any environmental adjustments made here will persist across operational runs inside this browser session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
