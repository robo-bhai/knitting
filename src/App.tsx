import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { FlashMessageContainer } from './components/common/FlashMessage';
import { DesktopWindowManager } from './components/layout/DesktopWindowManager';

// Module Views
import { DashboardView } from './components/modules/DashboardView';
import { PpcTreeView } from './components/modules/PpcTreeView';
import { MachineSignView } from './components/modules/MachineSignView';
import { RollEntryView } from './components/modules/RollEntryView';
import { RollWiseView } from './components/modules/RollWiseView';
import { QualityControlView } from './components/modules/QualityControlView';
import { FabricStoreView } from './components/modules/FabricStoreView';
import { DispatchView } from './components/modules/DispatchView';
import { PlanStatusView } from './components/modules/PlanStatusView';
import { SearchRollView } from './components/modules/SearchRollView';
import { HrStaffView } from './components/modules/HrStaffView';
import { HrAttendanceView } from './components/modules/HrAttendanceView';
import { HrLedgerView } from './components/modules/HrLedgerView';
import { HrPayrollView } from './components/modules/HrPayrollView';
import { AdminProView } from './components/modules/AdminProView';
import { ReportsMenuView } from './components/modules/ReportsMenuView';
import { AuxiliaryModulesView } from './components/modules/AuxiliaryModulesView';
import { JinjaTemplatesExplorer } from './components/modules/JinjaTemplatesExplorer';
import { CloudflareWorkflowView } from './components/modules/CloudflareWorkflowView';
import { MySQLMigrationView } from './components/modules/MySQLMigrationView';
import { LoginView } from './components/modules/LoginView';

const MainApp: React.FC = () => {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isDesktopMode, setIsDesktopMode] = useState<boolean>(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [selectedLedgerStaffId, setSelectedLedgerStaffId] = useState<number | null>(null);

  const handleOpenStaffLedger = (staffId: number) => {
    setSelectedLedgerStaffId(staffId);
    setActiveTab('hr_ledger');
  };

  // If user is not logged in, render the login page directly
  if (!currentUser && activeTab !== 'login') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center">
        <FlashMessageContainer />
        <LoginView onSuccess={() => setActiveTab('dashboard')} />
      </div>
    );
  }

  // Primary Requested UI: Desktop-like Multi-Window MDI Environment
  if (isDesktopMode) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <FlashMessageContainer />
        <DesktopWindowManager onToggleClassicMode={() => setIsDesktopMode(false)} />
      </div>
    );
  }

  // Classic Single-Page ERP View with Desktop Mode Switcher
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <FlashMessageContainer />

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        toggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        onLaunchDesktopMode={() => setIsDesktopMode(true)}
      />

      <div className="flex-1 flex">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileOpen={isMobileSidebarOpen}
          closeMobileSidebar={() => setIsMobileSidebarOpen(false)}
          onLaunchDesktopMode={() => setIsDesktopMode(true)}
        />

        {/* Content Area */}
        <main className="flex-1 lg:pl-64 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full transition-all">
          {activeTab === 'dashboard' && <DashboardView setActiveTab={setActiveTab} />}
          {activeTab === 'ppc_tree' && <PpcTreeView />}
          {activeTab === 'machine_sign' && <MachineSignView />}
          {activeTab === 'view_barcode' && <MachineSignView />}
          {activeTab === 'roll_entry' && <RollEntryView />}
          {activeTab === 'roll_wise' && <RollWiseView />}
          {activeTab === 'roll_quality' && <QualityControlView />}
          {activeTab === 'fabric_store' && <FabricStoreView />}
          {activeTab === 'dispatch' && <DispatchView />}
          {activeTab === 'plan_status' && <PlanStatusView />}
          {activeTab === 'search_roll' && <SearchRollView />}
          {activeTab === 'hr_staff' && <HrStaffView onOpenLedger={handleOpenStaffLedger} />}
          {activeTab === 'hr_search' && <HrStaffView onOpenLedger={handleOpenStaffLedger} />}
          {activeTab === 'hr_attendance' && <HrAttendanceView />}
          {activeTab === 'hr_ledger' && <HrLedgerView initialStaffId={selectedLedgerStaffId} />}
          {activeTab === 'hr_payroll' && <HrPayrollView />}
          {activeTab === 'admin_pro' && <AdminProView />}
          {activeTab === 'reports_menu' && <ReportsMenuView />}
          {activeTab === 'mysql_setup' && <MySQLMigrationView />}
          {activeTab === 'aux_operations' && <AuxiliaryModulesView />}
          {activeTab === 'cloudflare_workflow' && <CloudflareWorkflowView />}
          {activeTab === 'jinja_templates' && <JinjaTemplatesExplorer />}
          {activeTab === 'login' && <LoginView onSuccess={() => setActiveTab('dashboard')} />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
