import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { ExportPlanModal } from '../common/ExportPlanModal';
import {
  Factory, UserCircle2, LogOut, Code2, Shield, Menu, Monitor, FileSpreadsheet
} from 'lucide-react';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  toggleMobileSidebar: () => void;
  onLaunchDesktopMode?: () => void;
}

export const Navbar: React.FC<Props> = ({ setActiveTab, toggleMobileSidebar, onLaunchDesktopMode }) => {
  const { currentUser, switchRole, logout } = useApp();
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  return (
    <header className="bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 border-b border-slate-400 text-slate-800 sticky top-0 z-40 shadow-xs select-none">
      <div className="px-4 sm:px-6 h-13 flex items-center justify-between">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMobileSidebar}
            className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-blue-600 to-blue-800 border border-blue-900 flex items-center justify-center text-white shadow-xs group-hover:from-blue-500 group-hover:to-blue-700 transition-all">
              <Factory className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-slate-900 block leading-none">
                TEXFLOW <span className="text-blue-700 font-mono text-xs font-black">ERP</span>
              </span>
              <span className="text-[10px] text-slate-500 block leading-tight font-sans font-semibold">
                Industrial Garment &amp; Textile Suite
              </span>
            </div>
          </div>
        </div>

        {/* Right: Desktop Window Button, Role Switcher, Template Explorer & User */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-b from-emerald-600 via-teal-700 to-emerald-800 hover:from-emerald-500 hover:to-teal-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer border border-emerald-950"
            title="Export Work Order Plan to Excel workbook"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Plan</span>
          </button>

          {onLaunchDesktopMode && (
            <button
              onClick={onLaunchDesktopMode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-b from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer border border-blue-900"
              title="Switch to Desktop Multi-Window MDI workspace"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop MDI</span>
            </button>
          )}

          {/* MySQL Setup shortcut */}
          <button
            onClick={() => setActiveTab('mysql_setup')}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
            title="Configure MySQL database connection"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Database</span>
          </button>

          {/* Flask Jinja2 Templates Button */}
          <button
            onClick={() => setActiveTab('jinja_templates')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
            title="Inspect Flask Jinja2 HTML templates"
          >
            <Code2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Templates</span>
          </button>

          {/* Role switcher for rapid testing */}
          <div className="hidden md:flex items-center bg-slate-200/90 p-0.5 rounded-lg border border-slate-300 text-xs shadow-inner">
            <span className="px-2 text-[10px] uppercase font-mono text-slate-600 font-bold flex items-center gap-1">
              <Shield className="w-3 h-3 text-blue-700" />
              Role:
            </span>
            {(['admin', 'manager', 'incharge', 'clerk'] as UserRole[]).map(r => (
              <button
                key={r}
                onClick={() => switchRole(r)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  currentUser?.role === r
                    ? 'bg-white text-blue-900 font-extrabold shadow-2xs border border-slate-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          {/* User profile dropdown / status */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-300">
              <div className="text-right hidden sm:block">
                <span className="block text-xs font-bold text-slate-900 leading-none">
                  {currentUser.username}
                </span>
                <span className="text-[10px] text-blue-700 font-mono font-bold uppercase">
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('login')}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <UserCircle2 className="w-3.5 h-3.5" />
              Login
            </button>
          )}
        </div>
      </div>

      <ExportPlanModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </header>
  );
};
