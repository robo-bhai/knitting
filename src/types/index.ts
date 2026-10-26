export type UserRole = 'admin' | 'manager' | 'incharge' | 'clerk';

export interface User {
  id: number;
  username: string;
  password?: string;
  role: UserRole;
}

export type Department = 'PPC' | 'Lot Making' | 'Fabric Store';
export type SubRole = 'Helper' | 'Clerk' | 'Incharge';
export type StaffStatus = 'Active' | 'Inactive';

export interface Staff {
  id: number;
  emp_code: string;
  name: string;
  cnic: string;
  phone: string;
  address?: string;
  department: Department;
  sub_role: SubRole;
  salary: number;
  joining_date: string;
  status: StaffStatus;
  emergency_name?: string;
  emergency_phone?: string;
  joining_form_path?: string;
}

export type LedgerType = 'Advance' | 'Fine' | 'Bonus';

export interface LedgerEntry {
  id: number;
  staff_id: number;
  amount: number;
  type: LedgerType;
  description: string;
  date: string;
  created_by: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Half-Day';

export interface AttendanceRecord {
  id: number;
  staff_id: number;
  date: string;
  status: AttendanceStatus;
  marked_by: string;
}

export interface WorkOrder {
  id: number;
  work_order: string;
}

export interface Plan {
  id: number;
  work_order_id: number;
  plan_id: string;
}

export interface Bag {
  id: number;
  plan_id: number;
  bag_number: string;
  shade: string;
  created_at: string;
}

export interface Lot {
  id: number;
  bag_id: number;
  lot_name: string;
  fabric_length: number;
  fabric_weight: number; // Current remaining balance weight
  rem_weight?: number;   // Alias for balance weight
  plan_weight: number;   // Stable initial planned target weight
  bag_weight: number;    // Total bag planned weight
  bag_number?: string;
  needles: string;       // e.g. "24N", "28N"
  job_id: number;
  remarks: string;
  created_at: string;
}

export interface Job {
  id: number;
  job: number;
  work_order_ref: string;
  shade_ref: string;
  needles_ref: string;
}

export interface MachineAssignment {
  id: number;
  job_full_text: string; // e.g. "1/WO-2026-8801"
  needles: string;
  machine_no: string;
  unit_no: number;
  unique_code: string;  // 5-digit unique code
  created_at: string;
  work_order?: string;
  shade?: string;
}

export interface FabricRoll {
  id: number;
  work_order: string;
  plan_id: string;
  bag_number: string;
  lot_name: string;
  roll_no: number;
  weight: number;       // Produced Weight (PW)
  tube_no?: string;
  needles: string;
  created_at: string;
  barcode_used: string; // Machine assignment 5-digit code used
  roll_barcode: string; // Series-wise or unique roll barcode
  machine_no: string;
  is_merged?: boolean;
  merge_count?: number;
}

export interface QualityCheck {
  id: number;
  roll_id: string;      // Matches roll_barcode
  original_weight: number; // PW
  grade_a_weight: number;  // QW
  grade_b_weight: number;  // PW - QW
  checked_at: string;
  in_store: number;     // 0 = Not in store, 1 = In fabric store stock, 2 = Dispatched
}

export type BagStatus = 'Pending' | 'Finalized' | 'Dispatched';

export interface FinalizedBag {
  id: number;
  bag_number: string;
  work_order: string;
  total_rolls: number;
  total_weight: number;
  status: BagStatus;
  created_at: string;
}

export interface DispatchRecord {
  id: number;
  bag_number: string;
  customer_name: string;
  vehicle_no: string;
  driver_name: string;
  gate_pass_no: string;
  total_rolls: number;
  total_weight: number;
  dispatched_at: string;
  dispatched_by: string;
}

export interface FlashMessage {
  id: string;
  text: string;
  type: 'success' | 'danger' | 'warning' | 'info';
}

export interface RollSticker {
  roll_barcode: string;
  bag: string;
  lot: string;
  roll_no: number;
  job_wo: string;
  needle: string;
  shade: string;
  machine: string;
  weight: number | string;
  date: string;
  qw?: number | string;
  pw?: number;
  is_merged?: boolean;
  merged_added?: number;
}
