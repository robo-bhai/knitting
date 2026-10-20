import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard, GitFork, QrCode, ScrollText, CheckSquare,
  Warehouse, Truck, Users, CalendarCheck, Wallet, Receipt,
  Search, ShieldAlert, Cpu, FileSpreadsheet, Code2, Wrench, X
} from 'lucide-react';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileOpen: boolean;
  closeMobileSidebar: () => void;
  onLaunchDesktopMode?: () => void;
}

export const Sidebar: React.FC<Props> = ({ activeTab, setActiveTab, isMobileOpen, closeMobileSidebar, onLaunchDesktopMode }) => {
  const { currentUser } = useApp();
  const role = currentUser?.role || 'clerk';

  const navSections = [
    {
      title: 'CORE MODULES',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, route: '/' },
        ...(role === 'admin' ? [{ id: 'admin_pro', label: 'Admin Control Center', icon: ShieldAlert, route: '/admin' }] : []),
      ]
    },
    {
      title: 'PRODUCTION PLANNING & CONTROL (PPC)',
      items: [
        ...(['admin', 'manager'].includes(role) ? [{ id: 'ppc_tree', label: 'PPC Tree & Lots', icon: GitFork, route: '/ppc' }] : []),
        { id: 'plan_status', label: 'Plan Status & Finalize', icon: CheckSquare, route: '/plan-status' },
        { id: 'reports_menu', label: 'Plan Reports & Excel', icon: FileSpreadsheet, route: '/reports' },
      ]
    },
    {
      title: 'KNITTING & ROLL PRODUCTION',
      items: [
        { id: 'machine_sign', label: 'Machine Sign-In (5-Digit)', icon: Cpu, route: '/machine-sign' },
        { id: 'view_barcode', label: 'Machine Job Codes', icon: QrCode, route: '/view-barcode' },
        ...(['clerk', 'incharge', 'manager', 'admin'].includes(role) ? [
          { id: 'roll_entry', label: 'Roll Entry & Label Print', icon: ScrollText, route: '/roll-entry' },
          { id: 'roll_wise', label: 'Roll-Wise Tracking & Edit', icon: CalendarCheck, route: '/roll-wise' },
        ] : []),
        { id: 'search_roll', label: 'Search Roll Barcode', icon: Search, route: '/search-roll' },
      ]
    },
    {
      title: 'QUALITY & STORE INVENTORY',
      items: [
        { id: 'roll_quality', label: 'Quality Control (A/B Grade)', icon: CheckSquare, route: '/roll-quality' },
        { id: 'fabric_store', label: 'Fabric Store Intake', icon: Warehouse, route: '/fabric-store' },
        { id: 'dispatch', label: 'Dispatch & Gate Pass', icon: Truck, route: '/dispatch' },
      ]
    },
    {
      title: 'HUMAN RESOURCES (HR)',
      items: [
        ...(['admin', 'manager'].includes(role) ? [
          { id: 'hr_staff', label: 'Staff Directory', icon: Users, route: '/hr/staff' }
        ] : []),
        ...(['admin', 'manager', 'incharge'].includes(role) ? [
          { id: 'hr_attendance', label: 'Daily Attendance', icon: CalendarCheck, route: '/hr/attendance' }
        ] : []),
        ...(['admin', 'manager'].includes(role) ? [
          { id: 'hr_ledger', label: 'Staff Financial Ledger', icon: Wallet, route: '/hr/ledger' }
        ] : []),
        ...(role === 'admin' ? [
          { id: 'hr_payroll', label: 'Monthly Payroll', icon: Receipt, route: '/hr/payroll' }
        ] : []),
        { id: 'hr_search', label: 'Search Staff Profile', icon: Search, route: '/hr/search' },
      ]
    },
    {
      title: 'SYSTEM & CLOUD DATABASE',
      items: [
        { id: 'mysql_setup', label: 'MySQL Migration & Cloud', icon: LayoutDashboard, route: 'MySQL Setup' },
        { id: 'cloudflare_workflow', label: 'Cloudflare Tunnel (5h)', icon: Cpu, route: '.github/workflows' },
        { id: 'aux_operations', label: 'Auxiliary Forms', icon: Wrench, route: '/downtime, /yarn' },
        { id: 'jinja_templates', label: 'Flask Jinja2 Templates', icon: Code2, route: '/templates/*' },
      ]
    }
  ];

  const handleSelect = (id: string) => {
    setActiveTab(id);
    closeMobileSidebar();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-14 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-3 lg:hidden flex justify-between items-center border-b border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Navigation Menu</span>
          <button onClick={closeMobileSidebar} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
          {onLaunchDesktopMode && (
            <div className="pb-3 border-b border-slate-800">
              <button
                onClick={onLaunchDesktopMode}
                className="w-full p-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-left font-bold text-xs flex items-center justify-between shadow-md transition-all group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🖥️</span>
                  <div>
                    <div>Desktop Workspace</div>
                    <div className="text-[10px] text-emerald-100 font-normal">Side-by-side forms</div>
                  </div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-700/80 uppercase font-mono">Multi</span>
              </button>
            </div>
          )}

          {navSections.map(section => {
            if (section.items.length === 0) return null;
            return (
              <div key={section.title}>
                <div className="px-2 mb-2 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                  {section.title}
                </div>
                <div className="space-y-1">
                  {section.items.map(item => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                          isActive
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                            : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0 hidden sm:inline">
                          {item.route}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer Role Badge */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Active Session</span>
              <span className="text-xs font-semibold text-slate-200">{currentUser?.username || 'Guest'}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 border border-slate-700">
              {role}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
