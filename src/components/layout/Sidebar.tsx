import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard, GitFork, QrCode, ScrollText, CheckSquare,
  Warehouse, Truck, Users, CalendarCheck, Wallet, Receipt,
  Search, ShieldAlert, Cpu, FileSpreadsheet, Code2, Wrench, X, Monitor
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
          { id: 'hr_staff', label: 'Staff Personnel Register', icon: Users, route: '/hr/staff' },
          { id: 'hr_attendance', label: 'Daily Attendance', icon: CalendarCheck, route: '/hr/attendance' },
          { id: 'hr_ledger', label: 'Staff Ledgers & Advances', icon: Wallet, route: '/hr/ledger' },
          { id: 'hr_payroll', label: 'Monthly Payroll', icon: Receipt, route: '/hr/payroll' },
        ] : [])
      ]
    },
    {
      title: 'SYSTEM & TOOLS',
      items: [
        { id: 'mysql_setup', label: 'Cloud MySQL Database', icon: Wrench, route: '/mysql-migration' },
        { id: 'jinja_templates', label: 'Flask Jinja2 HTML Explorer', icon: Code2, route: '/templates-explorer' },
      ]
    }
  ];

  const handleSelect = (tabId: string) => {
    setActiveTab(tabId);
    closeMobileSidebar();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-2xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-13 bottom-0 left-0 z-40 w-64 bg-slate-200 border-r border-slate-300 flex flex-col transition-transform duration-200 shadow-sm lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-3 lg:hidden flex justify-between items-center border-b border-slate-300 bg-slate-300/60">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Navigation Menu</span>
          <button onClick={closeMobileSidebar} className="p-1 text-slate-600 hover:text-slate-900 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {onLaunchDesktopMode && (
            <div className="mb-3">
              <button
                onClick={() => {
                  onLaunchDesktopMode();
                  closeMobileSidebar();
                }}
                className="w-full p-2.5 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-between transition-all cursor-pointer border border-blue-900"
              >
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  <div className="text-left">
                    <div>Desktop Workspace</div>
                    <div className="text-[10px] text-blue-200 font-normal">Multi-Window Forms</div>
                  </div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900 uppercase font-mono font-bold">MDI</span>
              </button>
            </div>
          )}

          {navSections.map(section => {
            if (section.items.length === 0) return null;
            return (
              <div key={section.title} className="space-y-1">
                <div className="px-2 mb-1 text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                  {section.title}
                </div>
                <div className="space-y-0.5">
                  {section.items.map(item => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all text-left cursor-pointer ${
                          isActive
                            ? 'bg-white text-blue-900 border border-slate-300 font-extrabold shadow-2xs'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-500'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 shrink-0 hidden sm:inline">
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
        <div className="p-3 border-t border-slate-300 bg-slate-300/60 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold block">Operator</span>
              <span className="text-xs font-bold text-slate-900">{currentUser?.username || 'Guest'}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white text-blue-800 border border-slate-300 shadow-2xs">
              {role}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
