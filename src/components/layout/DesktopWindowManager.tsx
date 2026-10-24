import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import {
  ScrollText, Cpu, QrCode, GitFork, CheckSquare, Warehouse,
  Truck, Users, CalendarCheck, Wallet, Receipt, FileSpreadsheet,
  Search, ShieldAlert, Database, Minus, Square, X,
  Columns, Grid2X2, LayoutGrid, Monitor, Play,
  Clock, Shield, Maximize2, Minimize2, Eye
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
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
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

  // Handle mobile resize listener
  useEffect(() => {
    const handleResize = () => {
      const mobileNow = window.innerWidth < 768;
      setIsMobile(mobileNow);
      if (mobileNow) {
        setOpenWindows(prev => {
          const updated = { ...prev };
          const wsW = workspaceRef.current ? workspaceRef.current.clientWidth : window.innerWidth;
          const wsH = workspaceRef.current ? workspaceRef.current.clientHeight : (window.innerHeight - 90);
          Object.keys(updated).forEach(k => {
            updated[k] = {
              ...updated[k],
              x: 0,
              y: 0,
              width: wsW,
              height: wsH,
              maximized: true
            };
          });
          return updated;
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
      getComponent: () => <HrStaffView onOpenLedger={() => openModuleWindow('hr_ledger')} />
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

  // Initialize view: on mobile open single fullscreen window, on desktop apply split
  useEffect(() => {
    if (window.innerWidth < 768) {
      openModuleWindow('roll_wise');
    } else {
      applySplit5050();
    }
  }, []);

  const openModuleWindow = (moduleId: string) => {
    setIsStartMenuOpen(false);
    const mod = availableModules.find(m => m.id === moduleId);
    if (!mod) return;

    const mobileMode = window.innerWidth < 768;

    setOpenWindows(prev => {
      if (prev[moduleId]) {
        return {
          ...prev,
          [moduleId]: {
            ...prev[moduleId],
            minimized: false,
            maximized: mobileMode || prev[moduleId].maximized,
            zIndex: Math.min(topZ + 1, 800)
          }
        };
      }

      const count = Object.keys(prev).length;
      const wsW = workspaceRef.current ? workspaceRef.current.clientWidth : window.innerWidth;
      const wsH = workspaceRef.current ? workspaceRef.current.clientHeight : (window.innerHeight - 90);

      const w = mobileMode ? wsW : Math.min(wsW - 40, 840);
      const h = mobileMode ? wsH : Math.min(wsH - 40, 580);
      const x = mobileMode ? 0 : Math.max(20, (count % 5) * 35 + 30);
      const y = mobileMode ? 0 : Math.max(20, (count % 5) * 30 + 20);

      const newWin: WindowItem = {
        id: mod.id,
        title: mod.title,
        icon: mod.icon,
        category: mod.category,
        roles: mod.roles,
        component: mod.getComponent(),
        minimized: false,
        maximized: mobileMode,
        x,
        y,
        width: w,
        height: h,
        zIndex: Math.min(topZ + 1, 800)
      };

      return { ...prev, [moduleId]: newWin };
    });

    setActiveWindowId(moduleId);
    setTopZ(z => Math.min(z + 1, 800));
  };

  const focusWindow = (id: string) => {
    setActiveWindowId(id);
    setTopZ(z => {
      // Clamped to 800 so it can NEVER overlap the bottom taskbar (z-[9999])
      const nextZ = Math.min(z + 1, 800);
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

  // Dragging Handlers (Disabled on mobile)
  const handleMouseDownHeader = (id: string, e: React.MouseEvent) => {
    if (isMobile) return;
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
    if (!dragRef.current || isMobile) return;
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
    const wsW = workspaceRef.current ? workspaceRef.current.clientWidth : window.innerWidth;
    const wsH = workspaceRef.current ? workspaceRef.current.clientHeight : (window.innerHeight - 90);
    const halfW = Math.floor(wsW / 2);

    const m1 = availableModules.find(m => m.id === 'roll_wise')!;
    const m2 = availableModules.find(m => m.id === 'machine_sign')!;

    if (window.innerWidth < 768) {
      // On mobile, open single fullscreen window
      openModuleWindow('roll_wise');
      return;
    }

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
    if (window.innerWidth < 768) {
      openModuleWindow('roll_wise');
      return;
    }

    const wsW = workspaceRef.current ? workspaceRef.current.clientWidth : window.innerWidth;
    const wsH = workspaceRef.current ? workspaceRef.current.clientHeight : (window.innerHeight - 90);
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
    if (window.innerWidth < 768) {
      openModuleWindow('ppc_tree');
      return;
    }

    const wsW = workspaceRef.current ? workspaceRef.current.clientWidth : window.innerWidth;
    const wsH = workspaceRef.current ? workspaceRef.current.clientHeight : (window.innerHeight - 90);
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

    const wsW = workspaceRef.current ? workspaceRef.current.clientWidth : window.innerWidth;
    const wsH = workspaceRef.current ? workspaceRef.current.clientHeight : (window.innerHeight - 90);

    if (isMobile) {
      // On mobile, just maximize all
      setOpenWindows(prev => {
        const updated = { ...prev };
        wins.forEach(win => {
          updated[win.id] = { ...win, x: 0, y: 0, width: wsW, height: wsH, maximized: true };
        });
        return updated;
      });
      return;
    }

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
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-300 font-sans text-slate-900 select-none relative">
      {/* Top Desktop OS Header Bar */}
      <header className="h-11 sm:h-10 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 border-b border-slate-400 flex items-center justify-between px-2.5 sm:px-3 z-[9990] text-xs shadow-2xs shrink-0 text-slate-800">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 font-black tracking-tight text-slate-900">
            <span className="p-1 bg-blue-100 text-blue-700 rounded border border-blue-200 shadow-2xs">
              <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
            <span className="text-xs sm:text-sm">TEXFLOW <span className="text-blue-700 font-mono text-[10px] sm:text-[11px] font-bold">ORACLE ERP</span></span>
          </div>

          <div className="h-4 w-px bg-slate-300 hidden md:block"></div>

          {/* Desktop Presets Bar (hidden on mobile, visible md+) */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={applySplit5050}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-800 rounded font-semibold text-[11px] flex items-center gap-1.5 transition-colors border border-slate-300 shadow-2xs cursor-pointer"
              title="Split Screen 50/50"
            >
              <Columns className="w-3.5 h-3.5 text-blue-600" /> Split 50/50
            </button>
            <button
              onClick={applyThreeWayFloor}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-800 rounded font-semibold text-[11px] flex items-center gap-1.5 transition-colors border border-slate-300 shadow-2xs cursor-pointer"
              title="3-Way Production Floor"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" /> 3-Way Floor
            </button>
            <button
              onClick={applyGrid2x2}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-800 rounded font-semibold text-[11px] flex items-center gap-1.5 transition-colors border border-slate-300 shadow-2xs cursor-pointer"
              title="2x2 Multi-Window Grid"
            >
              <Grid2X2 className="w-3.5 h-3.5 text-amber-600" /> 2x2 Grid
            </button>
            <button
              onClick={tileAllVisible}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-800 rounded font-semibold text-[11px] flex items-center gap-1.5 transition-colors border border-slate-300 shadow-2xs cursor-pointer"
              title="Tile All Open Windows"
            >
              <Grid2X2 className="w-3.5 h-3.5 text-emerald-600" /> Tile All
            </button>
          </div>
        </div>

        {/* Header Right: Role, DB, Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Role Pill */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 px-2 py-0.5 rounded text-[11px] shadow-2xs">
            <Shield className="w-3 h-3 text-blue-700" />
            <select
              value={currentUser?.role || 'admin'}
              onChange={(e) => switchRole(e.target.value as UserRole)}
              className="bg-transparent text-blue-800 font-bold font-mono outline-hidden cursor-pointer uppercase text-[10px]"
            >
              <option value="admin" className="bg-white text-slate-900">Admin</option>
              <option value="manager" className="bg-white text-slate-900">Manager</option>
              <option value="incharge" className="bg-white text-slate-900">Incharge</option>
              <option value="clerk" className="bg-white text-slate-900">Clerk</option>
            </select>
          </div>

          {/* Classic View toggle */}
          <button
            onClick={onToggleClassicMode}
            className="px-2 sm:px-2.5 py-1 bg-slate-100 hover:bg-white text-slate-800 border border-slate-300 rounded text-[11px] font-bold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
            title="Switch to single-page sidebar view"
          >
            <Eye className="w-3 h-3 text-slate-600" />
            <span className="hidden sm:inline">Classic View</span>
          </button>

          {/* Clock */}
          <div className="text-[11px] font-mono text-slate-600 hidden sm:flex items-center gap-1 font-bold">
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
        className="flex-1 relative overflow-hidden bg-slate-300 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] pb-13 sm:pb-12"
      >
        {Object.values(openWindows).map((win) => {
          if (win.minimized) return null;
          const isActive = activeWindowId === win.id;
          const isFull = isMobile || win.maximized;

          return (
            <div
              key={win.id}
              style={{
                position: 'absolute',
                left: isFull ? 0 : win.x,
                top: isFull ? 0 : win.y,
                width: isFull ? '100%' : `${win.width}px`,
                height: isFull ? '100%' : `${win.height}px`,
                zIndex: win.zIndex
              }}
              onMouseDown={() => focusWindow(win.id)}
              className={`flex flex-col bg-white ${isFull ? 'rounded-none border-b-0' : 'rounded-lg'} overflow-hidden border shadow-xl transition-all ${
                isActive
                  ? 'border-blue-600 ring-2 ring-blue-500/30 shadow-2xl'
                  : 'border-slate-400 shadow-md'
              }`}
            >
              {/* Window Title Bar */}
              <div
                onMouseDown={(e) => handleMouseDownHeader(win.id, e)}
                className={`h-9 px-3 sm:px-3.5 flex items-center justify-between border-b cursor-move select-none transition-colors shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 text-white border-slate-600 font-bold'
                    : 'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 text-slate-700 border-slate-300 font-semibold'
                }`}
              >
                <div className="flex items-center gap-2 text-xs truncate">
                  <span className={`p-1 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-700'}`}>
                    <win.icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="truncate">{win.title}</span>
                  <span className={`hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.2 rounded uppercase ${
                    isActive ? 'bg-white/10 text-slate-200' : 'bg-slate-300 text-slate-600'
                  }`}>
                    {win.category}
                  </span>
                </div>

                {/* Window Actions */}
                <div className="flex items-center gap-1 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleMinimize(win.id)}
                    className={`w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer ${
                      isActive ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-300 text-slate-600'
                    }`}
                    title="Minimize"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  {!isMobile && (
                    <button
                      onClick={() => toggleMaximize(win.id)}
                      className={`w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer ${
                        isActive ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-300 text-slate-600'
                      }`}
                      title={win.maximized ? 'Restore' : 'Maximize'}
                    >
                      {win.maximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                    </button>
                  )}
                  <button
                    onClick={() => closeWindow(win.id)}
                    className="w-6 h-6 rounded hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Close Window"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Window Content Body */}
              <div className="flex-1 bg-slate-100 overflow-y-auto text-slate-800 p-2.5 sm:p-4 pb-20 sm:pb-8">
                {win.component}
              </div>
            </div>
          );
        })}

        {/* Empty State when all windows closed */}
        {Object.values(openWindows).filter(w => !w.minimized).length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-600">
            <div className="p-4 bg-white border border-slate-300 rounded-2xl mb-4 text-blue-700 shadow-md">
              <Monitor className="w-10 h-10" />
            </div>
            <h2 className="text-base font-extrabold text-slate-800 mb-1">Oracle ERP Desktop Workspace</h2>
            <p className="text-xs text-slate-600 max-w-sm mb-4 leading-relaxed font-medium">
              No windows are currently visible. Click <strong>Modules</strong> below to launch a form.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => openModuleWindow('roll_entry')}
                className="px-3.5 py-2 bg-gradient-to-b from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs border border-blue-900 cursor-pointer"
              >
                <ScrollText className="w-4 h-4" /> Open Roll Entry
              </button>
              <button
                onClick={() => setIsStartMenuOpen(true)}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-lg border border-slate-300 shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                Browse All Modules
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================
          BOTTOM TASKBAR: JAVA ORACLE ERP METALLIC SILVER
          ======================================================== */}
      <footer className="fixed bottom-0 left-0 right-0 h-12 bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 border-t border-slate-400 flex items-center justify-between px-2 sm:px-3 z-[9999] shadow-md select-none">
        <div className="flex items-center gap-2 flex-1 overflow-hidden mr-2">
          {/* Main "Modules" Launcher Button */}
          <button
            onClick={() => setIsStartMenuOpen(prev => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-all shrink-0 cursor-pointer ${
              isStartMenuOpen
                ? 'bg-blue-800 text-white ring-2 ring-blue-500'
                : 'bg-gradient-to-b from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white border border-blue-900'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="font-extrabold tracking-wide">Modules</span>
          </button>

          {/* Open Windows Dock Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full sm:max-w-3xl scrollbar-none">
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
                  className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 max-w-[150px] sm:max-w-[170px] truncate transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white text-blue-900 border border-slate-400 shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-white border border-slate-300'
                  }`}
                  title={win.title}
                >
                  <win.icon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{win.title.split(' ')[0]}</span>
                  {win.minimized && <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Taskbar Controls */}
        <div className="flex items-center gap-1 text-xs shrink-0">
          <button
            onClick={minimizeAll}
            className="p-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded text-[11px] border border-slate-300 shadow-2xs cursor-pointer"
            title="Minimize all windows"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={restoreAll}
            className="p-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded text-[11px] border border-slate-300 shadow-2xs cursor-pointer"
            title="Restore all windows"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={closeAll}
            className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 rounded text-[11px] shadow-2xs cursor-pointer"
            title="Close all open windows"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>

      {/* START MENU POPUP: ORACLE METALLIC SILVER */}
      {isStartMenuOpen && (
        <div
          className="fixed bottom-14 left-2 right-2 sm:right-auto sm:left-3 w-auto sm:w-96 max-h-[75vh] sm:max-h-[540px] bg-slate-100 border border-slate-400 rounded-2xl shadow-2xl p-4 z-[10000] flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150 text-slate-900"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-300 shrink-0">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-slate-900">TEXFLOW ORACLE ERP SUITE</div>
              <div className="text-[10px] text-slate-500 font-semibold">User Role: <span className="font-mono text-blue-700 uppercase font-bold">{currentUser?.role || 'admin'}</span></div>
            </div>
            <button
              onClick={() => setIsStartMenuOpen(false)}
              className="text-slate-500 hover:text-slate-900 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Module Filter */}
          <div className="relative shrink-0">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search forms & modules..."
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 font-sans shadow-2xs"
              autoFocus
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          </div>

          {/* Modules List Grid */}
          <div className="flex-1 overflow-y-auto max-h-[380px] space-y-1 pr-1 scrollbar-thin scrollbar-thumb-slate-300">
            {allowedModules
              .filter(m =>
                m.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
                m.category.toLowerCase().includes(searchFilter.toLowerCase())
              )
              .map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => openModuleWindow(mod.id)}
                  className="w-full text-left p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-500 flex items-center justify-between gap-3 group transition-all shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-blue-700 transition-colors shrink-0">
                      <mod.icon className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-blue-800 transition-colors">
                        {mod.title}
                      </div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">{mod.desc}</div>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 shrink-0 border border-slate-200">
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
