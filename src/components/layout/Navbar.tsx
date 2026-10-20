import React from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import {
  Factory, UserCircle2, LogOut, Code2, Shield, Menu
} from 'lucide-react';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  toggleMobileSidebar: () => void;
  onLaunchDesktopMode?: () => void;
}

export const Navbar: React.FC<Props> = ({ setActiveTab, toggleMobileSidebar, onLaunchDesktopMode }) => {
  const { currentUser, switchRole, logout } = useApp();

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMobileSidebar}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <Factory className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block leading-none">
                TEXFLOW <span className="text-emerald-400 font-mono text-xs font-normal">ERP</span>
              </span>
              <span className="text-[10px] text-slate-400 block leading-tight font-sans">
                Garment & Textile Manufacturing
              </span>
            </div>
          </div>
        </div>

        {/* Right: Desktop Window Button, Quick Role Switcher, Template Explorer & User */}
        <div className="flex items-center gap-3">
          {onLaunchDesktopMode && (
            <button
              onClick={onLaunchDesktopMode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
              title="Switch to Desktop Multi-Window MDI workspace"
            >
              <span>🖥️ Desktop Multi-Window</span>
            </button>
          )}

          {/* MySQL Setup shortcut */}
          <button
            onClick={() => setActiveTab('mysql_setup')}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs font-medium text-slate-200 transition-colors"
            title="Configure MySQL database connection"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>MySQL Cloud</span>
          </button>

          {/* Flask Jinja2 Templates Button */}
          <button
            onClick={() => setActiveTab('jinja_templates')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs font-medium text-slate-200 transition-colors"
            title="Inspect Flask Jinja2 HTML templates and copy them"
          >
            <Code2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Flask Templates</span>
          </button>

          {/* Role switcher for rapid testing */}
          <div className="hidden md:flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <span className="px-2 text-[10px] uppercase font-mono text-slate-500 font-semibold flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              Role:
            </span>
            {(['admin', 'manager', 'incharge', 'clerk'] as UserRole[]).map(r => (
              <button
                key={r}
                onClick={() => switchRole(r)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  currentUser?.role === r
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          {/* User profile dropdown / status */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <span className="block text-xs font-medium text-slate-200 leading-none">
                  {currentUser.username}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono uppercase">
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('login')}
              className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium"
            >
              <UserCircle2 className="w-3.5 h-3.5" />
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
