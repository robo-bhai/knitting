import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import {
  ScrollText, Cpu, QrCode, GitFork, CheckSquare, Warehouse,
  Truck, Users, CalendarCheck, Wallet, Receipt, FileSpreadsheet,
  Search, ShieldAlert, Database, Minus, Square, Copy, X,
  RotateCcw, Columns, Grid2X2, LayoutGrid, Monitor, Play,
  Clock, Shield, ArrowUpRight, Maximize2, Minimize2, Eye
} from 'lucide-react';

// Views
import { RollWiseView } from '../modules/RollWiseView';
import { MachineSignView } from '../modules/MachineSignView';
import { RollEntryView } from '../modules/RollEntryView';
import { PpcTreeView } from '../modules/PpcTreeView';
import { QualityControlView } from '../modules/QualityControlView';
import { FabricStoreView } from '../modules/FabricStoreView';
import { DispatchView } from '../modules/DispatchView';
import { PlanStatusView } from '../modules/PlanStatusView';
import { HrStaffView } from '../modules/HrStaffView';
import { HrAttendanceView } from '../modules/HrAttendanceView';
import { HrLedgerView } from '../modules/HrLedgerView';
import { HrPayrollView } from '../modules/HrPayrollView';
import { ReportsMenuView } from '../modules/ReportsMenuView';
import { AdminProView } from '../modules/AdminProView';
import { SearchRollView } from '../modules/SearchRollView';
import { MySQLMigrationView } from '../modules/MySQLMigrationView';

export interface WindowItem {
  id: string;
  title: string;
  icon: any;
  category: string;
  roles: UserRole[];
  component: React.ReactNode;
  minimized: boolean;
  maximized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

interface Props {
  onToggleClassicMode: () => void;
}

export const DesktopWindowManager: React.FC<Props> = ({ onToggleClassicMode }) => {
  const { currentUser, switchRole } = useApp();
  const [openWindows, setOpenWindows] = useState<Record<string, WindowItem>>({});
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [topZ, setTopZ] = useState<number>(20);
  const [isStartMenuOpen, setIsStartMenuOpen] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Dragging state
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Registry of all ERP Modules
  const availableModules: {
    id: string;
    title: string;
    shortTitle: string;
    desc: string;
    icon: any;
    category: string;
    roles: UserRole[];
    getComponent: () => React.ReactNode;
  }[] = [
    {
      id: 'roll_wise',
      title: 'Roll-Wise Production Tracking',
      shortTitle: 'Roll-Wise',
      desc: 'Real-time roll production, balance restoration & lock checking',
      icon: ScrollText,
      category: 'Production',
      roles: ['admin', 'manager', 'incharge', 'clerk'],
      getComponent: () => <RollWiseView />
    },
    {
      id: 'machine_sign',
      title: 'Machine Sign-In & 5-Digit Barcode',
      shortTitle: 'Machine Sign',
      desc: 'Machine binding, needle validation & unique assignment codes',
      icon: Cpu,
      category: 'Production',
      roles: ['admin', 'manager', 'incharge', 'clerk'],
      getComponent: () => <MachineSignView />
    },
    {
      id: 'roll_entry',
      title: 'Roll Entry & Weighing Scale',
      shortTitle: 'Roll Entry',
      desc: 'Barcode scanning, needle validation & lot weight deduction',
      icon: QrCode,
      category: 'Production',
      roles: ['admin', 'manager', 'incharge', 'clerk'],
      getComponent: () => <RollEntryView />
    },
    {
      id: 'ppc_tree',
      title: 'PPC Tree Hierarchy (WO/Plan/Bag/Lot)',
      shortTitle: 'PPC Tree',
      desc: 'PPC work orders, plans, bags, lots & stable plan weights',
      icon: GitFork,
      category: 'Planning',
      roles: ['admin', 'manager'],
      getComponent: () => <PpcTreeView />
    },
    {
      id: 'roll_quality',
      title: 'Roll Quality Control & Grading',
      shortTitle: 'QC Inspection',
      desc: 'Grade-A/B weight inspection & thermal sticker label generator',
      icon: CheckSquare,
      category: 'Quality',
      roles: ['admin', 'manager', 'incharge', 'clerk'],
      getComponent: () => <QualityControlView />
    },
    {
      id: 'fabric_store',
      title: 'Fabric Store & Bag Stocking',
      shortTitle: 'Fabric Store',
      desc: 'Scan bags and stock approved rolls in warehouse inventory',
      icon: Warehouse,
      category: 'Store & Dispatch',
      roles: ['admin', 'manager', 'incharge', 'clerk'],
      getComponent: () => <FabricStoreView />
    },
    {
      id: 'dispatch',
      title: 'Vehicle Dispatch & Gate Pass',
      shortTitle: 'Dispatch',
      desc: 'Gate Pass generation, driver assignment & roll outward',
      icon: Truck,
      category: 'Store & Dispatch',
      roles: ['admin', 'manager', 'incharge'],
      getComponent: () => <DispatchView />
    },
    {
      id: 'plan_status',
      title: 'Plan Status & Bag Finalization',
      shortTitle: 'Plan Status',
      desc: 'Quality clearance verification & bag finalization',
      icon: CheckSquare,
      category: 'Planning',
      roles: ['admin', 'manager', 'incharge', 'clerk'],
      getComponent: () => <PlanStatusView />
    },
    {
      id: 'hr_staff',
      title: 'Staff Directory & Personnel Profiles',
      shortTitle: 'HR Staff',
      desc: 'Department tagging, salary setup & personnel files',
      icon: Users,
      category: 'Human Resources',
      roles: ['admin', 'manager'],
      getComponent: () => <HrStaffView onOpenLedger={(id) => openModuleWindow('hr_ledger')} />
    },
    {
      id: 'hr_attendance',
      title: 'Daily Department Attendance',
      shortTitle: 'Attendance',
      desc: 'Mark daily attendance (Present, Absent, Half-Day) with department filters',
      icon: CalendarCheck,
      category: 'Human Resources',
      roles: ['admin', 'manager', 'incharge'],
      getComponent: () => <HrAttendanceView />
    },
    {
      id: 'hr_ledger',
      title: 'Staff Financial Ledger (Advances/Fines)',
      shortTitle: 'HR Ledger',
      desc: 'Track advances, fines, and bonuses per employee',
      icon: Wallet,
      category: 'Human Resources',
      roles: ['admin', 'manager'],
      getComponent: () => <HrLedgerView />
    },
    {
      id: 'hr_payroll',
      title: 'Monthly Payroll Calculation Report',
      shortTitle: 'Payroll',
      desc: 'Calculate monthly net salary based on attendance, advances & fines',
      icon: Receipt,
      category: 'Human Resources',
      roles: ['admin'],
      getComponent: () => <HrPayrollView />
    },
    {
      id: 'reports_menu',
      title: 'Detailed Plan & Production Reports',
      shortTitle: 'Reports',
      desc: '13-column detailed plan status reports and Excel exports',
      icon: FileSpreadsheet,
      category: 'Reports',
      roles: ['admin', 'manager', 'incharge', 'clerk'],
      getComponent: () => <ReportsMenuView />
    },
    {
      id: 'search_roll',
      title: 'Search Roll Barcode Traceability',
      shortTitle: 'Roll Search',
      desc: 'Instant barcode lookup with full machine, WO and quality audit trail',
      icon: Search,
      category: 'Production',
      roles: ['admin', 'manager', 'incharge', 'clerk'],
      getComponent: () => <SearchRollView />
    },
    {
      id: 'mysql_setup',
      title: 'MySQL Migration & Cloud Setup',
      shortTitle: 'MySQL Setup',
      desc: 'Connect to remote/cloud MySQL or Termux MariaDB with schema verification',
      icon: Database,
      category: 'System',
      roles: ['admin', 'manager'],
      getComponent: () => <MySQLMigrationView />
    },
    {
      id: 'admin_pro',
      title: 'Admin Pro Security & User Accounts',
      shortTitle: 'Admin Pro',
      desc: 'User account creation, role assignment & operational telemetry',
      icon: ShieldAlert,
      category: 'System',
      roles: ['admin'],
      getComponent: () => <AdminProView />
    }
  ];

  // Filter modules based on current user's role
  const allowedModules = availableModules.filter(m =>
    !currentUser || m.roles.includes(currentUser.role)
  );

  // Open default layout on mount (Split 50/50: Roll-Wise & Machine Sign)
  useEffect(() => {
    applySplit5050();
  }, []);

  const openModuleWindow = (moduleId: string) => {
    setIsStartMenuOpen(false);
    const mod = availableModules.find(m => m.id === moduleId);
    if (!mod) return;

    setOpenWindows(prev => {
      if (prev[moduleId]) {
        // If already open, un-minimize and focus
        return {
          ...prev,
          [moduleId]: {
            ...prev[moduleId],
            minimized: false,
            zIndex: topZ + 1
          }
        };
      }

      const count = Object.keys(prev).length;
      const wsW = workspaceRef.current ? workspaceRef.current.clientWidth : 1200;
      const wsH = workspaceRef.current ? workspaceRef.current.clientHeight : 700;

      const w = Math.min(wsW - 40, 840);
      const h = Math.min(wsH - 40, 580);
      const x = Math.max(20, (count % 5) * 35 + 30);
      const y = Math.max(20, (count % 5) * 30 + 20);

      const newWin: WindowItem = {
        id: mod.id,
        title: mod.title,
        icon: mod.icon,
        category: mod.category,
        roles: mod.roles,
        component: mod.getComponent(),
        minimized: false,
        maximized: false,
        x,
        y,
        width: w,
        height: h,
        zIndex: topZ + 1
      };

      return { ...prev, [moduleId]: newWin };
    });

    setActiveWindowId(moduleId);
    setTopZ(z => z + 1);
  };

  const focusWindow = (id: string) => {
    setActiveWindowId(id);
    setTopZ(z => {
      const nextZ = z + 1;
      setOpenWindows(prev => {
        if (!prev[id]) return prev;
        return {
          ...prev,
          [id]: { ...prev[id], zIndex: nextZ, minimized: false }
        };
      });
      return nextZ;
    });
  };

  const closeWindow = (id: string) => {
    setOpenWindows(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    if (activeWindowId === id) {
      const remaining = Object.keys(openWindows).filter(k => k !== id);
      setActiveWindowId(remaining.length > 0 ? remaining[remaining.length - 1] : null);
    }
  };

  const toggleMinimize = (id: string) => {
    setOpenWindows(prev => {
      if (!prev[id]) return prev;
      const isMin = !prev[id].minimized;
      return {
        ...prev,
        [id]: { ...prev[id], minimized: isMin }
      };
    });
    if (activeWindowId === id) {
      setActiveWindowId(null);
    }
  };

  const toggleMaximize = (id: string) => {
    setOpenWindows(prev => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], maximized: !prev[id].maximized }
      };
    });
    focusWindow(id);
  };

  // Dragging Handlers
  const handleMouseDownHeader = (id: string, e: React.MouseEvent) => {
    focusWindow(id);
    const win = openWindows[id];
    if (win && !win.maximized) {
      dragRef.current = {
        id,
        startX: e.clientX,
        startY: e.clientY,
        origX: win.x,
        origY: win.y
      };
    }
  };

  const handleMouseMoveWorkspace = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const { id, startX, startY, origX, origY } = dragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    setOpenWindows(prev => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          x: Math.max(0, origX + dx),
          y: Math.max(0, origY + dy)
        }
      };
    });
  };

  const handleMouseUpWorkspace = () => {
    dragRef.current = null;
  };

  // Presets
  const applySplit5050 = () => {
    const wsW = workspaceRef.current ? workspaceRef.current.clientWidth : 1200;
    const wsH = workspaceRef.current ? workspaceRef.current.clientHeight : 700;
    const halfW = Math.floor(wsW / 2);

    const m1 = availableModules.find(m => m.id === 'roll_wise')!;
    const m2 = availableModules.find(m => m.id === 'machine_sign')!;

    setOpenWindows({
      roll_wise: {
        id: 'roll_wise',
        title: m1.title,
        icon: m1.icon,
        category: m1.category,
        roles: m1.roles,
        component: m1.getComponent(),
        minimized: false,
        maximized: false,
        x: 0,
        y: 0,
        width: halfW - 2,
        height: wsH - 2,
        zIndex: 10
      },
      machine_sign: {
        id: 'machine_sign',
        title: m2.title,
        icon: m2.icon,
        category: m2.category,
        roles: m2.roles,
        component: m2.getComponent(),
        minimized: false,
        maximized: false,
        x: halfW + 2,
        y: 0,
        width: halfW - 2,
        height: wsH - 2,
        zIndex: 11
      }
    });
    setActiveWindowId('roll_wise');
    setTopZ(12);
  };

  const applyThreeWayFloor = () => {
    const wsW = workspaceRef.current ? workspaceRef.current.clientWidth : 1200;
    const wsH = workspaceRef.current ? workspaceRef.current.clientHeight : 700;
    const colW = Math.floor(wsW / 3);

    const m1 = availableModules.find(m => m.id === 'machine_sign')!;
    const m2 = availableModules.find(m => m.id === 'roll_entry')!;
    const m3 = availableModules.find(m => m.id === 'roll_wise')!;

    setOpenWindows({
      machine_sign: {
        id: 'machine_sign', title: m1.title, icon: m1.icon, category: m1.category, roles: m1.roles,
        component: m1.getComponent(), minimized: false, maximized: false,
        x: 0, y: 0, width: colW - 2, height: wsH - 2, zIndex: 10
      },
      roll_entry: {
        id: 'roll_entry', title: m2.title, icon: m2.icon, category: m2.category, roles: m2.roles,
        component: m2.getComponent(), minimized: false, maximized: false,
        x: colW + 2, y: 0, width: colW - 2, height: wsH - 2, zIndex: 11
      },
      roll_wise: {
        id: 'roll_wise', title: m3.title, icon: m3.icon, category: m3.category, roles: m3.roles,
        component: m3.getComponent(), minimized: false, maximized: false,
        x: colW * 2 + 4, y: 0, width: wsW - colW * 2 - 4, height: wsH - 2, zIndex: 12
      }
    });
    setActiveWindowId('roll_wise');
    setTopZ(13);
  };

  const applyGrid2x2 = () => {
    const wsW = workspaceRef.current ? workspaceRef.current.clientWidth : 1200;
    const wsH = workspaceRef.current ? workspaceRef.current.clientHeight : 700;
    const halfW = Math.floor(wsW / 2);
    const halfH = Math.floor(wsH / 2);

    const mods = ['ppc_tree', 'roll_entry', 'roll_quality', 'dispatch'].map(
      id => availableModules.find(m => m.id === id)!
    );

    const coords = [
      { x: 0, y: 0 },
      { x: halfW + 2, y: 0 },
      { x: 0, y: halfH + 2 },
      { x: halfW + 2, y: halfH + 2 }
    ];

    const newObj: Record<string, WindowItem> = {};
    mods.forEach((m, idx) => {
      newObj[m.id] = {
        id: m.id, title: m.title, icon: m.icon, category: m.category, roles: m.roles,
        component: m.getComponent(), minimized: false, maximized: false,
        x: coords[idx].x, y: coords[idx].y, width: halfW - 4, height: halfH - 4, zIndex: 10 + idx
      };
    });

    setOpenWindows(newObj);
    setActiveWindowId('ppc_tree');
    setTopZ(15);
  };

  const tileAllVisible = () => {
    const wins = Object.values(openWindows).filter(w => !w.minimized);
    if (wins.length === 0) return;

    const wsW = workspaceRef.current ? workspaceRef.current.clientWidth : 1200;
    const wsH = workspaceRef.current ? workspaceRef.current.clientHeight : 700;

    const cols = Math.ceil(Math.sqrt(wins.length));
    const rows = Math.ceil(wins.length / cols);
    const w = Math.floor(wsW / cols);
    const h = Math.floor(wsH / rows);

    setOpenWindows(prev => {
      const updated = { ...prev };
      wins.forEach((win, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        updated[win.id] = {
          ...win,
          x: c * w,
          y: r * h,
          width: w - 2,
          height: h - 2,
          maximized: false
        };
      });
      return updated;
    });
  };

  const minimizeAll = () => {
    setOpenWindows(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => {
        updated[k].minimized = true;
      });
      return updated;
    });
    setActiveWindowId(null);
  };

  const restoreAll = () => {
    setOpenWindows(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => {
        updated[k].minimized = false;
      });
      return updated;
    });
  };

  const closeAll = () => {
    setOpenWindows({});
    setActiveWindowId(null);
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 font-sans text-slate-100 select-none">
      {/* Top Desktop OS Header Bar */}
      <header className="h-10 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 z-40 text-xs shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-black tracking-tight text-white">
            <span className="p-1 bg-emerald-500/20 text-emerald-400 rounded">
              <Monitor className="w-4 h-4" />
            </span>
            <span>GARMENTFLOW <span className="text-emerald-400 font-mono text-[11px]">ERP OS</span></span>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>

          {/* Preset Layout Buttons */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={applySplit5050}
              className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded font-medium text-[11px] flex items-center gap-1.5 transition-colors"
              title="Split Screen 50/50"
            >
              <Columns className="w-3.5 h-3.5 text-emerald-400" /> Split 50/50
            </button>
            <button
              onClick={applyThreeWayFloor}
              className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded font-medium text-[11px] flex items-center gap-1.5 transition-colors"
              title="3-Way Production Floor"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-400" /> 3-Way Floor
            </button>
            <button
              onClick={applyGrid2x2}
              className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded font-medium text-[11px] flex items-center gap-1.5 transition-colors"
              title="2x2 Multi-Window Grid"
            >
              <Grid2X2 className="w-3.5 h-3.5 text-amber-400" /> 2x2 Grid
            </button>
            <button
              onClick={tileAllVisible}
              className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded font-medium text-[11px] flex items-center gap-1.5 transition-colors"
              title="Tile All Open Windows"
            >
              <Grid2X2 className="w-3.5 h-3.5 text-purple-400" /> Tile All
            </button>
          </div>
        </div>

        {/* Center / Right: DB Engine status, Role Selector & Clock */}
        <div className="flex items-center gap-3">
          {/* MySQL / SQLite Connection Badge */}
          <button
            onClick={() => openModuleWindow('mysql_setup')}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded font-mono text-[11px] transition-colors"
            title="Configure MySQL / SQLite database connection"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>MySQL/SQLite:</span>
            <span className="text-emerald-400 font-bold">Live</span>
          </button>

          {/* Role Switcher Pill */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded text-[11px]">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Role:</span>
            <select
              value={currentUser?.role || 'admin'}
              onChange={(e) => switchRole(e.target.value as UserRole)}
              className="bg-transparent text-emerald-400 font-bold font-mono outline-hidden cursor-pointer uppercase text-[10px]"
            >
              <option value="admin" className="bg-slate-900 text-white">Admin</option>
              <option value="manager" className="bg-slate-900 text-white">Manager</option>
              <option value="incharge" className="bg-slate-900 text-white">Incharge</option>
              <option value="clerk" className="bg-slate-900 text-white">Clerk</option>
            </select>
          </div>

          {/* Toggle to Classic Single Page Mode */}
          <button
            onClick={onToggleClassicMode}
            className="px-2.5 py-1 bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
            title="Switch to single-page sidebar view"
          >
            <Eye className="w-3.5 h-3.5" /> Classic View
          </button>

          {/* Desktop Clock */}
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            {currentTime}
          </div>
        </div>
      </header>

      {/* Main Multi-Window Desktop Workspace Canvas */}
      <main
        ref={workspaceRef}
        onMouseMove={handleMouseMoveWorkspace}
        onMouseUp={handleMouseUpWorkspace}
        className="flex-1 relative overflow-hidden bg-slate-950 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"
      >
        {Object.values(openWindows).map((win) => {
          if (win.minimized) return null;
          const isActive = activeWindowId === win.id;

          return (
            <div
              key={win.id}
              style={{
                position: 'absolute',
                left: win.maximized ? 0 : win.x,
                top: win.maximized ? 0 : win.y,
                width: win.maximized ? '100%' : `${win.width}px`,
                height: win.maximized ? '100%' : `${win.height}px`,
                zIndex: win.zIndex
              }}
              onMouseDown={() => focusWindow(win.id)}
              className={`flex flex-col bg-slate-900 rounded-xl overflow-hidden border shadow-2xl transition-all ${
                isActive
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-emerald-950/40'
                  : 'border-slate-700/80 shadow-black/60'
              }`}
            >
              {/* Window Title Bar */}
              <div
                onMouseDown={(e) => handleMouseDownHeader(win.id, e)}
                className={`h-9.5 px-3.5 flex items-center justify-between border-b cursor-move select-none transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white border-slate-700'
                    : 'bg-slate-900/90 text-slate-400 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold truncate">
                  <span className={`p-1 rounded ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                    <win.icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="truncate">{win.title}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 uppercase">
                    {win.category}
                  </span>
                </div>

                {/* Window Actions */}
                <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleMinimize(win.id)}
                    className="w-6 h-6 rounded hover:bg-slate-700/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                    title="Minimize to taskbar"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleMaximize(win.id)}
                    className="w-6 h-6 rounded hover:bg-slate-700/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                    title={win.maximized ? 'Restore' : 'Maximize'}
                  >
                    {win.maximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => closeWindow(win.id)}
                    className="w-6 h-6 rounded hover:bg-rose-900/80 text-slate-400 hover:text-rose-200 flex items-center justify-center transition-colors"
                    title="Close Window"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Window Content Body */}
              <div className="flex-1 bg-slate-50 overflow-y-auto text-slate-800 p-4">
                {win.component}
              </div>
            </div>
          );
        })}

        {/* Empty State when all windows closed */}
        {Object.values(openWindows).filter(w => !w.minimized).length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl mb-4 text-emerald-400 shadow-xl">
              <Monitor className="w-10 h-10" />
            </div>
            <h2 className="text-base font-bold text-slate-300 mb-1">Desktop Workspace Ready</h2>
            <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
              No windows are currently visible. Choose an ERP preset below or click <strong>Modules</strong> to launch tasks.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={applySplit5050}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md"
              >
                <Columns className="w-4 h-4" /> Open Production Split (50/50)
              </button>
              <button
                onClick={() => setIsStartMenuOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 flex items-center gap-1.5"
              >
                Browse All Modules
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Taskbar */}
      <footer className="h-11 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-3 z-50">
        <div className="flex items-center gap-2 flex-1 overflow-hidden mr-2">
          {/* Start Menu Button */}
          <button
            onClick={() => setIsStartMenuOpen(prev => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all ${
              isStartMenuOpen
                ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400/50'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Modules</span>
          </button>

          {/* Open Windows Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-3xl">
            {Object.values(openWindows).map((win) => {
              const isActive = activeWindowId === win.id && !win.minimized;
              return (
                <button
                  key={win.id}
                  onClick={() => {
                    if (win.minimized) {
                      focusWindow(win.id);
                    } else if (activeWindowId === win.id) {
                      toggleMinimize(win.id);
                    } else {
                      focusWindow(win.id);
                    }
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 max-w-[160px] truncate transition-all ${
                    isActive
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/50 shadow-inner'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                  title={win.title}
                >
                  <win.icon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{win.title.split(' ')[0]}</span>
                  {win.minimized && <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Taskbar Controls */}
        <div className="flex items-center gap-1 text-xs shrink-0">
          <button
            onClick={minimizeAll}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-[11px]"
            title="Minimize all windows"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={restoreAll}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-[11px]"
            title="Restore all windows"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={closeAll}
            className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded text-[11px]"
            title="Close all open windows"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>

      {/* Start Menu / App Launcher Popup */}
      {isStartMenuOpen && (
        <div
          className="fixed bottom-12 left-3 w-96 max-h-[540px] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-white">GarmentFlow ERP Suite</div>
              <div className="text-[10px] text-slate-400">Authenticated Role: <span className="font-mono text-emerald-400 uppercase font-bold">{currentUser?.role || 'admin'}</span></div>
            </div>
            <button
              onClick={() => setIsStartMenuOpen(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Module Filter */}
          <div className="relative">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search forms & modules..."
              className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 font-sans"
              autoFocus
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          </div>

          {/* Modules List Grid */}
          <div className="flex-1 overflow-y-auto max-h-[380px] space-y-1.5 pr-1">
            {allowedModules
              .filter(m =>
                m.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
                m.category.toLowerCase().includes(searchFilter.toLowerCase())
              )
              .map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => openModuleWindow(mod.id)}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 hover:border-emerald-500/50 flex items-center justify-between gap-3 group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-slate-800 group-hover:bg-emerald-500/20 text-emerald-400 transition-colors">
                      <mod.icon className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {mod.title}
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{mod.desc}</div>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono uppercase bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 shrink-0">
                    {mod.category}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
