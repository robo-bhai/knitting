import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User, UserRole, Staff, LedgerEntry, AttendanceRecord,
  WorkOrder, Plan, Bag, Lot, Job, MachineAssignment,
  FabricRoll, QualityCheck, FinalizedBag, DispatchRecord,
  FlashMessage, RollSticker
} from '../types';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  staff: Staff[];
  ledger: LedgerEntry[];
  attendance: AttendanceRecord[];
  workOrders: WorkOrder[];
  plans: Plan[];
  bags: Bag[];
  lots: Lot[];
  jobs: Job[];
  machineAssignments: MachineAssignment[];
  rolls: FabricRoll[];
  qualityChecks: QualityCheck[];
  finalizedBags: FinalizedBag[];
  dispatchRecords: DispatchRecord[];
  flashMessages: FlashMessage[];

  // Auth
  login: (username: string, role?: UserRole) => boolean;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  addUser: (username: string, role: UserRole, password?: string) => void;
  deleteUser: (id: number) => void;
  updateUserPassword: (id: number, newPass: string) => void;

  // Flash
  showFlash: (text: string, type?: FlashMessage['type']) => void;
  dismissFlash: (id: string) => void;

  // HR
  saveStaff: (data: Partial<Staff>) => void;
  updateStaff: (id: number, data: Partial<Staff>) => void;
  addLedgerEntry: (staffId: number, amount: number, type: 'Advance' | 'Fine' | 'Bonus', description: string) => void;
  saveDailyAttendance: (records: { staff_id: number; status: 'Present' | 'Absent' | 'Half-Day' }[], date: string) => void;

  // PPC
  addWorkOrder: (name: string) => void;
  editWorkOrder: (id: number, name: string) => void;
  deleteWorkOrder: (id: number) => void;
  addPlan: (workOrderId: number, planId: string) => void;
  editPlan: (id: number, planId: string) => void;
  deletePlan: (id: number) => void;
  addBag: (planId: number, bagNumber: string, shade: string) => void;
  editBag: (id: number, bagNumber: string, shade: string) => void;
  deleteBag: (id: number) => void;
  addLot: (bagId: number, data: { lot_name: string; fabric_length: number; fabric_weight: number; bag_weight: number; needles: string; remarks: string }) => void;
  editLot: (id: number, data: Partial<Lot>) => void;
  deleteLot: (id: number) => void;
  updateLotQty: (id: number, newWeight: number) => void;

  // Machine Sign
  assignMachine: (jobText: string, needles: string, machineNo: string, unitNo: number, shade?: string, workOrder?: string) => string;
  deleteMachineAssignment: (id: number) => void;

  // Roll Entry & Tracking
  saveRoll: (data: {
    work_order: string;
    plan_id: string;
    bag_number: string;
    lot_name: string;
    needles: string;
    weight: number;
    tube_no?: string;
    barcode: string;
    target_roll_no?: number;
  }) => {
    success: boolean;
    message?: string;
    sticker?: RollSticker;
    is_merged?: boolean;
    mismatch_type?: string;
    machine_spec?: any;
    lot_spec?: any;
  };
  editRoll: (rollId: number, newWeight: number) => { success: boolean; message: string };
  deleteRoll: (rollId: number) => { success: boolean; message: string };

  // Quality Control
  inspectQuality: (rollId: string, sameWeight: boolean, manualWeight: number, isQuarry: boolean) => { success: boolean; message: string; sticker?: RollSticker };

  // Fabric Store & Dispatch
  saveStoreStock: (barcodes: string[]) => { success: boolean; message?: string };
  dispatchBag: (bagNumber: string, customerName: string, vehicleNo: string, driverName: string) => { success: boolean; message: string };
  finalizeBag: (bagNumber: string, workOrder: string) => { success: boolean; message: string };

  // Helpers
  getJobForLot: (workOrder: string, shade: string, needles: string) => Job | undefined;
  getLotsForBag: (bagNumber: string) => any[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Flash messages
  const [flashMessages, setFlashMessages] = useState<FlashMessage[]>([
    { id: '1', text: 'Welcome to TexFlow Industrial Management ERP', type: 'info' }
  ]);

  const showFlash = (text: string, type: FlashMessage['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setFlashMessages(prev => [...prev, { id, text, type }]);
    setTimeout(() => dismissFlash(id), 6000);
  };

  const dismissFlash = (id: string) => {
    setFlashMessages(prev => prev.filter(m => m.id !== id));
  };

  // 1. Users
  const [users, setUsers] = useState<User[]>([
    { id: 1, username: 'admin', role: 'admin' },
    { id: 2, username: 'm1234', role: 'manager' },
    { id: 3, username: 'i1234', role: 'incharge' },
    { id: 4, username: 'c1234', role: 'clerk' },
  ]);
  const [currentUser, setCurrentUser] = useState<User | null>(users[0]); // default admin

  const login = (username: string, requestedRole?: UserRole) => {
    const found = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (found) {
      setCurrentUser(found);
      showFlash(`Logged in as ${found.role.toUpperCase()} (${found.username})`, 'success');
      return true;
    }
    // Fallback login
    const newUser: User = { id: Date.now(), username, role: requestedRole || 'clerk' };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    showFlash(`Logged in as ${newUser.role.toUpperCase()}`, 'success');
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    showFlash('Logged out successfully', 'info');
  };

  const switchRole = (role: UserRole) => {
    const userForRole = users.find(u => u.role === role);
    if (userForRole) {
      setCurrentUser(userForRole);
      showFlash(`Switched view to ${role.toUpperCase()} mode`, 'info');
    } else {
      if (currentUser) {
        setCurrentUser({ ...currentUser, role });
        showFlash(`Switched role to ${role.toUpperCase()}`, 'info');
      }
    }
  };

  const addUser = (username: string, role: UserRole, password = 'password123') => {
    const newUser: User = { id: Date.now(), username, role, password };
    setUsers(prev => [...prev, newUser]);
    showFlash(`User "${username}" created with role ${role.toUpperCase()}`, 'success');
  };

  const deleteUser = (id: number) => {
    if (users.length <= 1) {
      showFlash('Cannot delete the last remaining user!', 'danger');
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== id));
    showFlash('User deleted', 'info');
  };

  const updateUserPassword = (id: number, _newPass: string) => {
    showFlash(`Password updated successfully for user ID ${id}`, 'success');
  };

  // 2. HR Staff
  const [staff, setStaff] = useState<Staff[]>([
    {
      id: 1,
      emp_code: 'TF-101',
      name: 'Muhammad Tariq',
      cnic: '35201-1234567-1',
      phone: '0300-1234567',
      address: 'Plot 45, Industrial Estate, Faisalabad',
      department: 'PPC',
      sub_role: 'Incharge',
      salary: 75000,
      joining_date: '2023-01-15',
      status: 'Active',
      emergency_name: 'Ahmed Tariq (Brother)',
      emergency_phone: '0301-7654321',
      joining_form_path: 'staff_1_join_form.pdf'
    },
    {
      id: 2,
      emp_code: 'TF-102',
      name: 'Rashid Mahmood',
      cnic: '35201-2345678-3',
      phone: '0312-3456789',
      address: 'Mill Colony Quarter 12, Lahore',
      department: 'Lot Making',
      sub_role: 'Clerk',
      salary: 48000,
      joining_date: '2023-06-10',
      status: 'Active',
      emergency_name: 'Mahmood Ali (Father)',
      emergency_phone: '0321-9876543'
    },
    {
      id: 3,
      emp_code: 'TF-103',
      name: 'Sajid Hussain',
      cnic: '35201-3456789-5',
      phone: '0333-8877665',
      address: 'Street 4, Sector 7, Sheikhupura Road',
      department: 'Fabric Store',
      sub_role: 'Helper',
      salary: 35000,
      joining_date: '2024-02-01',
      status: 'Active',
      emergency_name: 'Zahid Hussain (Cousin)',
      emergency_phone: '0345-4433221'
    },
    {
      id: 4,
      emp_code: 'TF-104',
      name: 'Naveed Akhtar',
      cnic: '35201-4567890-7',
      phone: '0302-9988776',
      address: 'Mohallah Millat Town, Faisalabad',
      department: 'PPC',
      sub_role: 'Helper',
      salary: 36000,
      joining_date: '2024-04-18',
      status: 'Active',
      emergency_name: 'Akhtar Ali (Father)',
      emergency_phone: '0300-5544332'
    }
  ]);

  const saveStaff = (data: Partial<Staff>) => {
    const existingIndex = staff.findIndex(
      s => s.emp_code.toUpperCase() === (data.emp_code || '').trim().toUpperCase()
    );
    if (existingIndex >= 0) {
      setStaff(prev => prev.map((s, idx) => (idx === existingIndex ? { ...s, ...data } : s)));
      showFlash(`Staff record for ${data.name} updated`, 'success');
    } else {
      const newStaff: Staff = {
        id: Date.now(),
        emp_code: (data.emp_code || `TF-${staff.length + 101}`).trim().toUpperCase(),
        name: data.name || 'New Staff',
        cnic: data.cnic || '',
        phone: data.phone || '',
        address: data.address || '',
        department: data.department || 'PPC',
        sub_role: data.sub_role || 'Helper',
        salary: Number(data.salary) || 35000,
        joining_date: data.joining_date || new Date().toISOString().split('T')[0],
        status: data.status || 'Active',
        emergency_name: data.emergency_name,
        emergency_phone: data.emergency_phone
      };
      setStaff(prev => [...prev, newStaff]);
      showFlash(`Staff ${newStaff.name} registered successfully`, 'success');
    }
  };

  const updateStaff = (id: number, data: Partial<Staff>) => {
    setStaff(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    showFlash('Personnel file updated successfully', 'success');
  };

  // 3. HR Ledger
  const [ledger, setLedger] = useState<LedgerEntry[]>([
    { id: 1, staff_id: 2, amount: 5000, type: 'Advance', description: 'Medical expense advance', date: '2026-10-05', created_by: 'admin' },
    { id: 2, staff_id: 3, amount: 1000, type: 'Fine', description: 'Late arrival penalty (3 days)', date: '2026-10-12', created_by: 'm1234' },
    { id: 3, staff_id: 1, amount: 4000, type: 'Bonus', description: 'Quarterly shift target completion', date: '2026-10-15', created_by: 'admin' },
  ]);

  const addLedgerEntry = (staff_id: number, amount: number, type: 'Advance' | 'Fine' | 'Bonus', description: string) => {
    const entry: LedgerEntry = {
      id: Date.now(),
      staff_id,
      amount: Number(amount),
      type,
      description,
      date: new Date().toISOString().split('T')[0],
      created_by: currentUser?.username || 'admin'
    };
    setLedger(prev => [entry, ...prev]);
    showFlash(`${type} of Rs. ${amount.toLocaleString()} recorded successfully`, 'info');
  };

  // 4. Attendance
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([
    { id: 1, staff_id: 1, date: '2026-10-20', status: 'Present', marked_by: 'i1234' },
    { id: 2, staff_id: 2, date: '2026-10-20', status: 'Present', marked_by: 'i1234' },
    { id: 3, staff_id: 3, date: '2026-10-20', status: 'Half-Day', marked_by: 'i1234' },
    { id: 4, staff_id: 4, date: '2026-10-20', status: 'Present', marked_by: 'i1234' },
    // Historical for payroll demonstration
    { id: 5, staff_id: 1, date: '2026-10-19', status: 'Present', marked_by: 'i1234' },
    { id: 6, staff_id: 2, date: '2026-10-19', status: 'Present', marked_by: 'i1234' },
    { id: 7, staff_id: 3, date: '2026-10-19', status: 'Present', marked_by: 'i1234' },
    { id: 8, staff_id: 4, date: '2026-10-19', status: 'Absent', marked_by: 'i1234' },
  ]);

  const saveDailyAttendance = (records: { staff_id: number; status: 'Present' | 'Absent' | 'Half-Day' }[], date: string) => {
    setAttendance(prev => {
      const filtered = prev.filter(r => r.date !== date);
      const newEntries = records.map((r, idx) => ({
        id: Date.now() + idx,
        staff_id: r.staff_id,
        date,
        status: r.status,
        marked_by: currentUser?.username || 'admin'
      }));
      return [...filtered, ...newEntries];
    });
    showFlash(`Attendance marked for ${date}`, 'success');
  };

  // 5. PPC Hierarchy: Work Orders, Plans, Bags, Lots, Jobs
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([
    { id: 1, work_order: 'WO-2026-8801' },
    { id: 2, work_order: 'WO-2026-8802' },
  ]);

  const [plans, setPlans] = useState<Plan[]>([
    { id: 1, work_order_id: 1, plan_id: 'PL-8801-A' },
    { id: 2, work_order_id: 1, plan_id: 'PL-8801-B' },
    { id: 3, work_order_id: 2, plan_id: 'PL-8802-A' },
  ]);

  const [bags, setBags] = useState<Bag[]>([
    { id: 1, plan_id: 1, bag_number: 'BAG-8801-01', shade: 'Navy Blue', created_at: '2026-10-15' },
    { id: 2, plan_id: 1, bag_number: 'BAG-8801-02', shade: 'Jet Black', created_at: '2026-10-16' },
    { id: 3, plan_id: 3, bag_number: 'BAG-8802-01', shade: 'Heather Grey', created_at: '2026-10-18' },
  ]);

  const [jobs, setJobs] = useState<Job[]>([
    { id: 1, job: 1, work_order_ref: 'WO-2026-8801', shade_ref: 'Navy Blue', needles_ref: '24N' },
    { id: 2, job: 2, work_order_ref: 'WO-2026-8801', shade_ref: 'Jet Black', needles_ref: '28N' },
    { id: 3, job: 1, work_order_ref: 'WO-2026-8802', shade_ref: 'Heather Grey', needles_ref: '24N' },
  ]);

  const [lots, setLots] = useState<Lot[]>([
    {
      id: 1,
      bag_id: 1,
      lot_name: 'LOT-A1',
      fabric_length: 1200,
      fabric_weight: 405.0, // Remaining balance
      plan_weight: 450.0,   // Stable plan weight
      bag_weight: 900.0,
      needles: '24N',
      job_id: 1,
      remarks: 'Cotton Combed 30s Single Jersey',
      created_at: '2026-10-15'
    },
    {
      id: 2,
      bag_id: 1,
      lot_name: 'LOT-A2',
      fabric_length: 1250,
      fabric_weight: 450.0,
      plan_weight: 450.0,
      bag_weight: 900.0,
      needles: '24N',
      job_id: 1,
      remarks: 'Carded Ring Spun Weft',
      created_at: '2026-10-15'
    },
    {
      id: 3,
      bag_id: 2,
      lot_name: 'LOT-B1',
      fabric_length: 1500,
      fabric_weight: 550.0,
      plan_weight: 550.0,
      bag_weight: 550.0,
      needles: '28N',
      job_id: 2,
      remarks: 'Lycra Rib 1x1 Elastic',
      created_at: '2026-10-16'
    },
    {
      id: 4,
      bag_id: 3,
      lot_name: 'LOT-C1',
      fabric_length: 980,
      fabric_weight: 380.0,
      plan_weight: 380.0,
      bag_weight: 380.0,
      needles: '24N',
      job_id: 1,
      remarks: 'Terry Fleece 280 GSM',
      created_at: '2026-10-18'
    }
  ]);

  // PPC CRUD operations
  const addWorkOrder = (name: string) => {
    const trimmed = name.trim().toUpperCase();
    if (!trimmed) return;
    const wo: WorkOrder = { id: Date.now(), work_order: trimmed };
    setWorkOrders(prev => [...prev, wo]);
    showFlash(`Work Order ${trimmed} added`, 'success');
  };

  const editWorkOrder = (id: number, name: string) => {
    const trimmed = name.trim().toUpperCase();
    setWorkOrders(prev => prev.map(wo => wo.id === id ? { ...wo, work_order: trimmed } : wo));
    showFlash('Work order updated', 'success');
  };

  const deleteWorkOrder = (id: number) => {
    setWorkOrders(prev => prev.filter(wo => wo.id !== id));
    showFlash('Work order deleted', 'info');
  };

  const addPlan = (workOrderId: number, planId: string) => {
    const trimmed = planId.trim().toUpperCase();
    const plan: Plan = { id: Date.now(), work_order_id: workOrderId, plan_id: trimmed };
    setPlans(prev => [...prev, plan]);
    showFlash(`Plan ${trimmed} added`, 'success');
  };

  const editPlan = (id: number, planId: string) => {
    const trimmed = planId.trim().toUpperCase();
    setPlans(prev => prev.map(p => p.id === id ? { ...p, plan_id: trimmed } : p));
    showFlash('Plan updated', 'success');
  };

  const deletePlan = (id: number) => {
    setPlans(prev => prev.filter(p => p.id !== id));
    showFlash('Plan deleted', 'info');
  };

  const addBag = (planId: number, bagNumber: string, shade: string) => {
    const bag: Bag = {
      id: Date.now(),
      plan_id: planId,
      bag_number: bagNumber.trim().toUpperCase(),
      shade: shade.trim(),
      created_at: new Date().toISOString().split('T')[0]
    };
    setBags(prev => [...prev, bag]);
    showFlash(`Bag ${bag.bag_number} added`, 'success');
  };

  const editBag = (id: number, bagNumber: string, shade: string) => {
    setBags(prev => prev.map(b => b.id === id ? { ...b, bag_number: bagNumber.trim().toUpperCase(), shade: shade.trim() } : b));
    showFlash('Bag updated', 'success');
  };

  const deleteBag = (id: number) => {
    setBags(prev => prev.filter(b => b.id !== id));
    showFlash('Bag deleted', 'info');
  };

  const getJobForLot = (woVal: string, shadeVal: string, needlesVal: string) => {
    return jobs.find(
      j => j.work_order_ref === woVal &&
           j.shade_ref.toLowerCase() === shadeVal.toLowerCase() &&
           j.needles_ref.toLowerCase() === needlesVal.toLowerCase()
    );
  };

  const addLot = (bagId: number, data: { lot_name: string; fabric_length: number; fabric_weight: number; bag_weight: number; needles: string; remarks: string }) => {
    const bag = bags.find(b => b.id === bagId);
    if (!bag) return;
    const plan = plans.find(p => p.id === bag.plan_id);
    const wo = workOrders.find(w => w.id === plan?.work_order_id);
    const currWo = wo?.work_order || 'WO-DEFAULT';
    const currShade = bag.shade;
    const needles = data.needles.trim().toUpperCase();

    // Find or create Job ID
    let jobNo = 1;
    const existingJob = getJobForLot(currWo, currShade, needles);
    if (existingJob) {
      jobNo = existingJob.job;
    } else {
      const existingJobsForWo = jobs.filter(j => j.work_order_ref === currWo);
      const maxJob = existingJobsForWo.reduce((max, j) => Math.max(max, j.job), 0);
      jobNo = maxJob + 1;
      const newJob: Job = {
        id: Date.now(),
        job: jobNo,
        work_order_ref: currWo,
        shade_ref: currShade,
        needles_ref: needles
      };
      setJobs(prev => [...prev, newJob]);
    }

    const inputWeight = Number(data.fabric_weight);
    const newLotItem: Lot = {
      id: Date.now(),
      bag_id: bagId,
      lot_name: data.lot_name.trim().toUpperCase(),
      fabric_length: Number(data.fabric_length),
      fabric_weight: inputWeight,
      plan_weight: inputWeight,
      bag_weight: Number(data.bag_weight),
      needles,
      job_id: jobNo,
      remarks: data.remarks || '',
      created_at: new Date().toISOString().split('T')[0]
    };
    setLots(prev => [...prev, newLotItem]);
    showFlash(`Lot Added! (Job #${jobNo})`, 'success');
  };

  const editLot = (id: number, data: Partial<Lot>) => {
    setLots(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
    showFlash('Lot updated', 'success');
  };

  const deleteLot = (id: number) => {
    setLots(prev => prev.filter(l => l.id !== id));
    showFlash('Lot deleted', 'info');
  };

  const updateLotQty = (id: number, newWeight: number) => {
    const targetLot = lots.find(l => l.id === id);
    if (!targetLot) return;
    const bagId = targetLot.bag_id;

    setLots(prev => {
      const updated = prev.map(l => l.id === id ? { ...l, fabric_weight: newWeight, plan_weight: newWeight } : l);
      const totalBagWeight = updated.filter(l => l.bag_id === bagId).reduce((sum, l) => sum + l.plan_weight, 0);
      return updated.map(l => l.bag_id === bagId ? { ...l, bag_weight: totalBagWeight } : l);
    });
    showFlash(`Updated Lot Target to ${newWeight} KG. Bag Total synchronized.`, 'success');
  };

  // 6. Machine Sign Module
  const [machineAssignments, setMachineAssignments] = useState<MachineAssignment[]>([
    {
      id: 1,
      job_full_text: '1/WO-2026-8801',
      needles: '24N',
      machine_no: 'M-01',
      unit_no: 1,
      unique_code: '54219',
      created_at: '2026-10-18 09:30',
      work_order: 'WO-2026-8801',
      shade: 'Navy Blue'
    },
    {
      id: 2,
      job_full_text: '2/WO-2026-8801',
      needles: '28N',
      machine_no: 'M-04',
      unit_no: 2,
      unique_code: '81943',
      created_at: '2026-10-19 14:15',
      work_order: 'WO-2026-8801',
      shade: 'Jet Black'
    },
    {
      id: 3,
      job_full_text: '1/WO-2026-8802',
      needles: '24N',
      machine_no: 'M-08',
      unit_no: 1,
      unique_code: '39201',
      created_at: '2026-10-20 08:00',
      work_order: 'WO-2026-8802',
      shade: 'Heather Grey'
    },
    {
      id: 4,
      job_full_text: '1/786',
      needles: '2660',
      machine_no: 'M-07',
      unit_no: 1,
      unique_code: '78601',
      created_at: '2026-10-24 10:00',
      work_order: '786',
      shade: 'White'
    }
  ]);

  const assignMachine = (jobText: string, needles: string, machineNo: string, unitNo: number, shade?: string, workOrder?: string) => {
    // Generate unique 5-digit code
    let code = '';
    do {
      code = Math.floor(10000 + Math.random() * 90000).toString();
    } while (machineAssignments.some(m => m.unique_code === code));

    let detectedWo = workOrder;
    if (!detectedWo && jobText.includes('/')) {
      detectedWo = jobText.split('/')[1].trim();
    }

    const assignment: MachineAssignment = {
      id: Date.now(),
      job_full_text: jobText,
      needles,
      machine_no: machineNo,
      unit_no: Number(unitNo),
      unique_code: code,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
      work_order: detectedWo || '',
      shade: shade || ''
    };
    setMachineAssignments(prev => [assignment, ...prev]);
    showFlash(`Machine ${machineNo} signed with 5-digit Barcode: ${code} (WO: ${detectedWo || '--'}, Shade: ${shade || '--'}, Needles: ${needles})`, 'success');
    return code;
  };

  const deleteMachineAssignment = (id: number) => {
    setMachineAssignments(prev => prev.filter(m => m.id !== id));
    showFlash('Machine signed out successfully.', 'info');
  };

  // 7. Rolls, Quality Checks, Finalized Bags, Dispatches
  const [rolls, setRolls] = useState<FabricRoll[]>([
    {
      id: 1,
      work_order: 'WO-2026-8801',
      plan_id: 'PL-8801-A',
      bag_number: 'BAG-8801-01',
      lot_name: 'LOT-A1',
      roll_no: 1,
      weight: 22.5,
      tube_no: 'T-101',
      needles: '24N',
      created_at: '2026-10-19 10:15',
      barcode_used: '54219',
      roll_barcode: '7192843',
      machine_no: 'M-01'
    },
    {
      id: 2,
      work_order: 'WO-2026-8801',
      plan_id: 'PL-8801-A',
      bag_number: 'BAG-8801-01',
      lot_name: 'LOT-A1',
      roll_no: 2,
      weight: 22.5,
      tube_no: 'T-102',
      needles: '24N',
      created_at: '2026-10-19 11:45',
      barcode_used: '54219',
      roll_barcode: '7192844',
      machine_no: 'M-01'
    }
  ]);

  const [qualityChecks, setQualityChecks] = useState<QualityCheck[]>([
    {
      id: 1,
      roll_id: '7192843',
      original_weight: 22.5,
      grade_a_weight: 22.5,
      grade_b_weight: 0.0,
      checked_at: '2026-10-19 12:30',
      in_store: 1
    },
    {
      id: 2,
      roll_id: '7192844',
      original_weight: 22.5,
      grade_a_weight: 22.0,
      grade_b_weight: 0.5,
      checked_at: '2026-10-19 13:00',
      in_store: 0
    }
  ]);

  const [finalizedBags, setFinalizedBags] = useState<FinalizedBag[]>([
    {
      id: 1,
      bag_number: 'BAG-PREV-99',
      work_order: 'WO-2026-8801',
      total_rolls: 8,
      total_weight: 180.0,
      status: 'Dispatched',
      created_at: '2026-10-17 15:00'
    }
  ]);

  const [dispatchRecords, setDispatchRecords] = useState<DispatchRecord[]>([
    {
      id: 1,
      bag_number: 'BAG-PREV-99',
      customer_name: 'Al-Karam Textile Mills',
      vehicle_no: 'LES-9921',
      driver_name: 'Muhammad Aslam',
      gate_pass_no: 'GP-2026-1044',
      total_rolls: 8,
      total_weight: 180.0,
      dispatched_at: '2026-10-18 16:30',
      dispatched_by: 'Admin'
    }
  ]);

  // Save Roll Handler (Mirrors backend logic in main.py)
  const saveRoll = (data: {
    work_order: string;
    plan_id: string;
    bag_number: string;
    lot_name: string;
    needles: string;
    weight: number;
    tube_no?: string;
    barcode: string;
    target_roll_no?: number;
  }) => {
    // 1. Identify Bag and Shade
    const bag = bags.find(b => b.bag_number.trim().toLowerCase() === data.bag_number.trim().toLowerCase());
    if (!bag) {
      return { success: false, message: 'Bag/Work Order not found in PPC!' };
    }
    const shade = bag.shade;
    const woVal = data.work_order.trim();

    // 2. Validate Scanned 5-Digit Machine Barcode
    const barcodeScanned = data.barcode.trim();
    if (!barcodeScanned) {
      return { success: false, message: '5-Digit Machine Barcode is required!' };
    }

    const mAssignment = machineAssignments.find(m => m.unique_code.trim() === barcodeScanned);
    if (!mAssignment) {
      return {
        success: false,
        mismatch_type: 'barcode_not_found',
        message: `🚨 Scanned 5-Digit Barcode '${barcodeScanned}' is NOT signed in system! Pehle Machine Sign-In (/machine-sign) karein.`
      };
    }

    // Values derived from scanned barcode
    const mNeedles = (mAssignment.needles || '').trim();
    let mWo = (mAssignment.work_order || '').trim();
    if (!mWo && mAssignment.job_full_text && mAssignment.job_full_text.includes('/')) {
      mWo = mAssignment.job_full_text.split('/')[1].trim();
    }
    const mShade = (mAssignment.shade || '').trim();

    // Auto-detected system values
    const detectedWo = woVal.split('/').pop()?.trim() || woVal;
    const detectedShade = (shade || '').trim();
    const detectedNeedles = (data.needles || '').trim();

    const machineSpec = {
      unique_code: barcodeScanned,
      machine_no: mAssignment.machine_no,
      needles: mNeedles,
      shade: mShade,
      work_order: mWo
    };

    const lotSpec = {
      needles: detectedNeedles,
      shade: detectedShade,
      work_order: detectedWo
    };

    const clean = (s: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    // 1. Strict Work Order Match
    const cMWo = clean(mWo);
    const cSysWo = clean(detectedWo);
    if (cMWo !== cSysWo) {
      return {
        success: false,
        mismatch_type: 'work_order',
        message: `🚨 Work Order Mismatch! Scanned Barcode '${barcodeScanned}' belongs to Work Order '${mWo}', but system detected Work Order is '${detectedWo}'.`,
        machine_spec: machineSpec,
        lot_spec: lotSpec
      };
    }

    // 2. Strict Shade Match
    const cMShade = clean(mShade);
    const cSysShade = clean(detectedShade);
    if (cMShade && cSysShade && cMShade !== cSysShade) {
      return {
        success: false,
        mismatch_type: 'shade',
        message: `🚨 Fabric Shade Mismatch! Scanned Barcode '${barcodeScanned}' has Shade '${mShade}', but system detected Shade is '${detectedShade}'.`,
        machine_spec: machineSpec,
        lot_spec: lotSpec
      };
    }

    // 3. Strict Needles Match
    const cMNeedles = clean(mNeedles);
    const cSysNeedles = clean(detectedNeedles);
    if (cMNeedles !== cSysNeedles) {
      return {
        success: false,
        mismatch_type: 'needles',
        message: `🚨 Needles Specification Mismatch! Scanned Barcode '${barcodeScanned}' has Needles '${mNeedles}', but selected Lot requires '${detectedNeedles}'.`,
        machine_spec: machineSpec,
        lot_spec: lotSpec
      };
    }

    // All 3 Match! Mark as successful and proceed
    const currentJobFull = mAssignment.job_full_text || `Job-1/${woVal}`;

    // 3. Check if target roll already exists for Merge
    const targetRoll = data.target_roll_no;
    let existingRoll = null;
    if (targetRoll !== undefined && targetRoll !== null && !isNaN(targetRoll) && targetRoll > 0) {
      existingRoll = rolls.find(
        r => r.work_order.trim().toLowerCase() === woVal.toLowerCase() &&
             r.bag_number.trim().toLowerCase() === data.bag_number.trim().toLowerCase() &&
             r.lot_name.trim().toLowerCase() === data.lot_name.trim().toLowerCase() &&
             r.roll_no === targetRoll
      );
    }

    const addedWeight = Number(data.weight);

    if (existingRoll) {
      // MERGE WEIGHT
      const oldWeight = existingRoll.weight;
      const mergedWeight = Math.round((oldWeight + addedWeight) * 100) / 100;
      const mergeCount = (existingRoll.merge_count || 0) + 1;
      const rollBarcode = existingRoll.roll_barcode || `R-${data.bag_number.replace(/[^a-zA-Z0-9]/g, '')}-${String(targetRoll).padStart(2, '0')}`;

      setRolls(prev => prev.map(r => r.id === existingRoll!.id ? {
        ...r,
        weight: mergedWeight,
        tube_no: data.tube_no || r.tube_no,
        barcode_used: barcodeScanned,
        machine_no: mAssignment.machine_no,
        is_merged: true,
        merge_count: mergeCount
      } : r));

      // Deduct added weight from Lot Balance
      setLots(prev =>
        prev.map(l => {
          if (l.lot_name.trim().toLowerCase() === data.lot_name.trim().toLowerCase() && l.bag_id === bag.id) {
            return { ...l, fabric_weight: Math.max(0, Math.round((l.fabric_weight - addedWeight) * 100) / 100) };
          }
          return l;
        })
      );

      const sticker: RollSticker = {
        roll_barcode: rollBarcode,
        bag: data.bag_number,
        lot: data.lot_name,
        roll_no: targetRoll!,
        job_wo: currentJobFull,
        needle: data.needles,
        shade,
        machine: mAssignment.machine_no,
        weight: mergedWeight,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        is_merged: true,
        merged_added: addedWeight
      };

      showFlash(`Roll #${targetRoll} already exists! Merged +${addedWeight} KG. New Weight: ${mergedWeight} KG`, 'success');
      return { success: true, is_merged: true, sticker };
    }

    // 4. New Sequential Roll
    let newRollNo = 1;
    if (targetRoll !== undefined && targetRoll !== null && !isNaN(targetRoll) && targetRoll > 0) {
      newRollNo = targetRoll;
    } else {
      const lotRolls = rolls.filter(
        r => r.work_order.trim().toLowerCase() === woVal.toLowerCase() &&
             r.bag_number.trim().toLowerCase() === data.bag_number.trim().toLowerCase() &&
             r.lot_name.trim().toLowerCase() === data.lot_name.trim().toLowerCase()
      );
      const maxNo = lotRolls.reduce((max, r) => Math.max(max, r.roll_no), 0);
      newRollNo = maxNo + 1;
    }

    // Series-wise barcode: 1 k bad 2 k bad 3: e.g. R-BAG880101-01, R-BAG880101-02
    const cleanBagStr = data.bag_number.replace(/[^a-zA-Z0-9]/g, '');
    const seriesBarcode = `R-${cleanBagStr}-${String(newRollNo).padStart(2, '0')}`;

    const newRoll: FabricRoll = {
      id: Date.now(),
      work_order: woVal,
      plan_id: data.plan_id,
      bag_number: data.bag_number,
      lot_name: data.lot_name,
      roll_no: newRollNo,
      weight: addedWeight,
      tube_no: data.tube_no || `T-${newRollNo + 100}`,
      needles: data.needles,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
      barcode_used: barcodeScanned,
      roll_barcode: seriesBarcode,
      machine_no: mAssignment.machine_no,
      is_merged: false,
      merge_count: 0
    };

    setRolls(prev => [...prev, newRoll]);

    // Deduct weight from PPC Lot Balance
    setLots(prev =>
      prev.map(l => {
        if (l.lot_name.trim().toLowerCase() === data.lot_name.trim().toLowerCase() && l.bag_id === bag.id) {
          return { ...l, fabric_weight: Math.max(0, Math.round((l.fabric_weight - addedWeight) * 100) / 100) };
        }
        return l;
      })
    );

    const sticker: RollSticker = {
      roll_barcode: seriesBarcode,
      bag: data.bag_number,
      lot: data.lot_name,
      roll_no: newRollNo,
      job_wo: currentJobFull,
      needle: data.needles,
      shade,
      machine: mAssignment.machine_no,
      weight: addedWeight,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      is_merged: false
    };

    showFlash(`Roll #${newRollNo} fed successfully! Barcode: ${seriesBarcode}`, 'success');
    return { success: true, is_merged: false, sticker };
  };

  // Edit Roll Handler (checks lock on finalized/dispatched bag, adjusts balance)
  const editRoll = (rollId: number, newWeight: number) => {
    const roll = rolls.find(r => r.id === rollId);
    if (!roll) return { success: false, message: 'Roll not found' };

    const fb = finalizedBags.find(b => b.bag_number === roll.bag_number);
    if (fb && (fb.status === 'Finalized' || fb.status === 'Dispatched')) {
      return { success: false, message: `Cannot edit: Bag is ${fb.status}` };
    }

    const diff = roll.weight - newWeight;
    const bag = bags.find(b => b.bag_number === roll.bag_number);

    // Adjust lot balance
    if (bag) {
      setLots(prev =>
        prev.map(l => {
          if (l.lot_name === roll.lot_name && l.needles === roll.needles && l.bag_id === bag.id) {
            return { ...l, fabric_weight: l.fabric_weight + diff };
          }
          return l;
        })
      );
    }

    setRolls(prev => prev.map(r => r.id === rollId ? { ...r, weight: newWeight } : r));
    showFlash(`Roll #${roll.roll_no} updated to ${newWeight} KG. Balance adjusted.`, 'success');
    return { success: true, message: 'Roll updated successfully' };
  };

  // Delete Roll Handler
  const deleteRoll = (rollId: number) => {
    const roll = rolls.find(r => r.id === rollId);
    if (!roll) return { success: false, message: 'Roll not found' };

    const fb = finalizedBags.find(b => b.bag_number === roll.bag_number);
    if (fb && (fb.status === 'Finalized' || fb.status === 'Dispatched')) {
      return { success: false, message: `Cannot delete: Bag is ${fb.status}` };
    }

    const bag = bags.find(b => b.bag_number === roll.bag_number);
    if (bag) {
      setLots(prev =>
        prev.map(l => {
          if (l.lot_name === roll.lot_name && l.needles === roll.needles && l.bag_id === bag.id) {
            return { ...l, fabric_weight: l.fabric_weight + roll.weight };
          }
          return l;
        })
      );
    }

    setRolls(prev => prev.filter(r => r.id !== rollId));
    setQualityChecks(prev => prev.filter(qc => qc.roll_id !== roll.roll_barcode));
    showFlash(`Roll deleted and ${roll.weight} KG balance restored to Lot.`, 'info');
    return { success: true, message: 'Roll deleted successfully' };
  };

  // Quality Control Inspector
  const inspectQuality = (barcode: string, sameWeight: boolean, manualWeight: number, isQuarry: boolean) => {
    const roll = rolls.find(r => r.roll_barcode === barcode);
    if (!roll) {
      return { success: false, message: 'Roll Barcode ID not found!' };
    }
    const qRecord = qualityChecks.find(q => q.roll_id === barcode);
    const bag = bags.find(b => b.bag_number === roll.bag_number);
    const pw = roll.weight;

    if (!isQuarry && qRecord) {
      return { success: false, message: 'Roll already scanned in Quality!' };
    }

    let qw: number | string = 'Pending';
    if (isQuarry) {
      qw = qRecord ? qRecord.grade_a_weight : 'Pending';
    } else {
      const parsedQw = sameWeight ? pw : Number(manualWeight);
      if (parsedQw > pw) {
        return { success: false, message: 'Quality Weight (QW) cannot be greater than Produced Weight (PW)!' };
      }
      const bGrade = pw - parsedQw;
      qw = parsedQw;

      const newQc: QualityCheck = {
        id: Date.now(),
        roll_id: barcode,
        original_weight: pw,
        grade_a_weight: parsedQw,
        grade_b_weight: bGrade,
        checked_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
        in_store: 0
      };
      setQualityChecks(prev => [...prev, newQc]);

      // Auto-check if 100% rolls for this bag have passed QC; if so, automatically finalize bag!
      try {
        const cleanBagName = (roll.bag_number || '').split('(')[0].trim().toLowerCase();
        const bagRolls = rolls.filter(r => (r.bag_number || '').split('(')[0].trim().toLowerCase() === cleanBagName);
        const allBagDone = bagRolls.length > 0 && bagRolls.every(r => r.roll_barcode === barcode || qualityChecks.some(qc => qc.roll_id === r.roll_barcode));
        if (allBagDone) {
          const totalWeight = bagRolls.reduce((sum, r) => {
            if (r.roll_barcode === barcode) return sum + parsedQw;
            const q = qualityChecks.find(qc => qc.roll_id === r.roll_barcode);
            return sum + (q ? q.grade_a_weight : r.weight);
          }, 0);

          setFinalizedBags(prev => {
            const exists = prev.find(b => (b.bag_number || '').split('(')[0].trim().toLowerCase() === cleanBagName);
            if (exists) {
              return prev.map(b => (b.bag_number || '').split('(')[0].trim().toLowerCase() === cleanBagName
                ? { ...b, status: 'Finalized', total_rolls: bagRolls.length, total_weight: totalWeight }
                : b);
            } else {
              return [{
                id: Date.now(),
                bag_number: roll.bag_number,
                work_order: roll.work_order,
                total_rolls: bagRolls.length,
                total_weight: totalWeight,
                status: 'Finalized',
                created_at: new Date().toISOString().replace('T', ' ').substring(0, 16)
              }, ...prev];
            }
          });
        }
      } catch (err) {
        console.warn('Auto finalize on QC error:', err);
      }

      // Restore balance if B-Grade fabric was found
      if (bGrade > 0 && bag) {
        setLots(prev =>
          prev.map(l => {
            if (l.lot_name === roll.lot_name && l.needles === roll.needles && l.bag_id === bag.id) {
              return { ...l, fabric_weight: l.fabric_weight + bGrade };
            }
            return l;
          })
        );
        showFlash(`B-Grade fabric (${bGrade.toFixed(2)} KG) detected and restored to Lot balance!`, 'warning');
      }
    }

    const sticker: RollSticker = {
      bag: roll.bag_number,
      lot: roll.lot_name,
      roll_no: roll.roll_no,
      job_wo: roll.work_order,
      shade: bag?.shade || '',
      needle: roll.needles,
      machine: roll.machine_no,
      pw,
      qw,
      weight: qw !== 'Pending' ? qw : pw,
      roll_barcode: barcode,
      date: new Date().toISOString().split('T')[0]
    };

    if (!isQuarry) {
      showFlash(`Quality check passed for Roll ${barcode}. A-Grade: ${qw} KG`, 'success');
    }
    return { success: true, message: isQuarry ? 'Roll record retrieved' : 'Quality check saved', sticker };
  };

  // Fabric Store Stocking
  const saveStoreStock = (barcodes: string[]) => {
    if (!barcodes || barcodes.length === 0) {
      return { success: false, message: 'No rolls selected!' };
    }
    setQualityChecks(prev =>
      prev.map(qc => barcodes.includes(qc.roll_id) ? { ...qc, in_store: 1 } : qc)
    );
    showFlash(`${barcodes.length} roll(s) received into Fabric Store inventory`, 'success');
    return { success: true };
  };

  // Dispatch Bag
  const dispatchBag = (bagNumber: string, customerName: string, vehicleNo: string, driverName: string) => {
    const finalizedBag = finalizedBags.find(b => b.bag_number === bagNumber);
    if (!finalizedBag) {
      return { success: false, message: `Bag ${bagNumber} is not finalized or does not exist!` };
    }
    const alreadyDispatched = dispatchRecords.find(d => d.bag_number === bagNumber);
    if (alreadyDispatched) {
      return { success: false, message: `Bag ${bagNumber} has already been dispatched!` };
    }

    const gatePassNo = `GP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRecord: DispatchRecord = {
      id: Date.now(),
      bag_number: bagNumber,
      customer_name: customerName,
      vehicle_no: vehicleNo,
      driver_name: driverName,
      gate_pass_no: gatePassNo,
      total_rolls: finalizedBag.total_rolls,
      total_weight: finalizedBag.total_weight,
      dispatched_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
      dispatched_by: currentUser?.username || 'Admin'
    };

    setDispatchRecords(prev => [newRecord, ...prev]);

    // Mark finalized bag as Dispatched
    setFinalizedBags(prev =>
      prev.map(b => b.bag_number === bagNumber ? { ...b, status: 'Dispatched' } : b)
    );

    // Mark rolls as dispatched (in_store = 2)
    const bagRollBarcodes = rolls.filter(r => r.bag_number === bagNumber).map(r => r.roll_barcode);
    setQualityChecks(prev =>
      prev.map(qc => bagRollBarcodes.includes(qc.roll_id) ? { ...qc, in_store: 2 } : qc)
    );

    showFlash(`Bag ${bagNumber} dispatched successfully! Gate Pass: ${gatePassNo}`, 'success');
    return { success: true, message: 'Bag dispatched successfully' };
  };

  // Finalize Bag Handler
  const finalizeBag = (bagNumber: string, workOrder: string) => {
    if (!bagNumber) return { success: false, message: 'Bag number is required!' };
    const cleanBagNo = bagNumber.split('(')[0].trim().toLowerCase();
    const bagRolls = rolls.filter(r => (r.bag_number || '').split('(')[0].trim().toLowerCase() === cleanBagNo);
    if (bagRolls.length === 0) {
      return { success: false, message: 'No rolls produced for this bag yet!' };
    }

    // Sum grade A weight or roll weight
    let totalKg = 0;
    for (const r of bagRolls) {
      const qc = qualityChecks.find(q => q.roll_id === r.roll_barcode);
      totalKg += (qc && qc.grade_a_weight > 0) ? qc.grade_a_weight : r.weight;
    }

    const effWo = workOrder || bagRolls[0]?.work_order || 'WO-101';
    const existing = finalizedBags.find(b => (b.bag_number || '').split('(')[0].trim().toLowerCase() === cleanBagNo);

    if (existing) {
      setFinalizedBags(prev =>
        prev.map(b => (b.bag_number || '').split('(')[0].trim().toLowerCase() === cleanBagNo
          ? { ...b, status: 'Finalized', total_rolls: bagRolls.length, total_weight: totalKg, work_order: effWo }
          : b)
      );
    } else {
      const newFinalized: FinalizedBag = {
        id: Date.now(),
        bag_number: bagRolls[0]?.bag_number || bagNumber,
        work_order: effWo,
        total_rolls: bagRolls.length,
        total_weight: totalKg,
        status: 'Finalized',
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      setFinalizedBags(prev => [newFinalized, ...prev]);
    }

    showFlash(`✅ Bag ${bagNumber} finalized with ${bagRolls.length} rolls (${totalKg.toFixed(2)} KG) & Ready for Dispatch!`, 'success');
    return { success: true, message: `Bag ${bagNumber} finalized!` };
  };

  const getLotsForBag = (bagNumber: string) => {
    if (!bagNumber) return [];
    const raw = String(bagNumber).trim();
    const cleanBagNo = raw.split('(')[0].trim().toLowerCase();

    // Match bag by exact number, trimmed number, without shade, or by ID
    const bag = bags.find(b => {
      const bNo = b.bag_number.trim().toLowerCase();
      return bNo === cleanBagNo ||
             bNo === raw.toLowerCase() ||
             String(b.id) === cleanBagNo ||
             String(b.id) === raw;
    });

    if (!bag) {
      return lots
        .filter(l =>
          String(l.bag_id) === cleanBagNo ||
          l.lot_name.trim().toLowerCase() === cleanBagNo ||
          (l as any).bag_number?.trim().toLowerCase() === cleanBagNo
        )
        .map(l => ({
          id: l.id,
          bag_id: l.bag_id,
          lot_name: l.lot_name,
          needles: l.needles || '24N',
          fabric_weight: Number(l.fabric_weight ?? l.rem_weight ?? 0),
          rem_weight: Number(l.fabric_weight ?? l.rem_weight ?? 0),
          plan_weight: Number(l.plan_weight ?? 0),
          barcode: null,
          machine_no: null,
          roll_count: 0
        }));
    }
    const bagIdStr = String(bag.id);
    const targetBagNo = bag.bag_number.trim().toLowerCase();

    return lots
      .filter(l => {
        if (l.bag_id === bag.id) return true;
        if (String(l.bag_id) === bagIdStr) return true;
        if (l.lot_name.trim().toLowerCase() === cleanBagNo) return true;
        if ((l as any).bag_number && String((l as any).bag_number).trim().toLowerCase() === targetBagNo) return true;
        return false;
      })
      .map(l => {
        const lotRolls = rolls.filter(r =>
          (r.bag_number?.trim().toLowerCase() === targetBagNo || r.bag_number?.trim().toLowerCase() === cleanBagNo) &&
          r.lot_name?.trim().toLowerCase() === l.lot_name.trim().toLowerCase()
        );
        const lastRollWithBarcode = lotRolls.find(r => r.barcode_used);
        const mAssigned = lastRollWithBarcode ? machineAssignments.find(m => m.unique_code === lastRollWithBarcode.barcode_used) : null;
        return {
          id: l.id,
          bag_id: l.bag_id,
          lot_name: l.lot_name,
          needles: l.needles || '24N',
          fabric_weight: Number(l.fabric_weight ?? l.rem_weight ?? 0),
          rem_weight: Number(l.fabric_weight ?? l.rem_weight ?? 0),
          plan_weight: Number(l.plan_weight ?? 0),
          barcode: lastRollWithBarcode?.barcode_used || null,
          machine_no: mAssigned?.machine_no || null,
          roll_count: lotRolls.length
        };
      });
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        staff,
        ledger,
        attendance,
        workOrders,
        plans,
        bags,
        lots,
        jobs,
        machineAssignments,
        rolls,
        qualityChecks,
        finalizedBags,
        dispatchRecords,
        flashMessages,
        login,
        logout,
        switchRole,
        addUser,
        deleteUser,
        updateUserPassword,
        showFlash,
        dismissFlash,
        saveStaff,
        updateStaff,
        addLedgerEntry,
        saveDailyAttendance,
        addWorkOrder,
        editWorkOrder,
        deleteWorkOrder,
        addPlan,
        editPlan,
        deletePlan,
        addBag,
        editBag,
        deleteBag,
        addLot,
        editLot,
        deleteLot,
        updateLotQty,
        assignMachine,
        deleteMachineAssignment,
        saveRoll,
        editRoll,
        deleteRoll,
        inspectQuality,
        saveStoreStock,
        dispatchBag,
        finalizeBag,
        getJobForLot,
        getLotsForBag
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
