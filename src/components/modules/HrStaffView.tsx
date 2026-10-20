import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Staff, Department, SubRole } from '../../types';
import {
  Users, UserPlus, Search, Edit3, Wallet, Phone,
  MapPin, Shield, CheckCircle2, AlertCircle, FileText
} from 'lucide-react';

interface Props {
  onOpenLedger: (staffId: number) => void;
}

export const HrStaffView: React.FC<Props> = ({ onOpenLedger }) => {
  const { staff, saveStaff, updateStaff } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('All');

  // Staff Modal (Add / Edit Profile)
  const [modalState, setModalState] = useState<{
    open: boolean;
    editId?: number;
    emp_code: string;
    name: string;
    cnic: string;
    phone: string;
    address: string;
    department: Department;
    sub_role: SubRole;
    salary: string;
    emergency_name: string;
    emergency_phone: string;
  }>({
    open: false,
    emp_code: '',
    name: '',
    cnic: '',
    phone: '',
    address: '',
    department: 'PPC',
    sub_role: 'Helper',
    salary: '35000',
    emergency_name: '',
    emergency_phone: ''
  });

  const openNewStaffModal = () => {
    setModalState({
      open: true,
      emp_code: `TF-${staff.length + 101}`,
      name: '',
      cnic: '',
      phone: '',
      address: '',
      department: 'PPC',
      sub_role: 'Helper',
      salary: '35000',
      emergency_name: '',
      emergency_phone: ''
    });
  };

  const openEditStaffModal = (s: Staff) => {
    setModalState({
      open: true,
      editId: s.id,
      emp_code: s.emp_code,
      name: s.name,
      cnic: s.cnic,
      phone: s.phone,
      address: s.address || '',
      department: s.department,
      sub_role: s.sub_role,
      salary: s.salary.toString(),
      emergency_name: s.emergency_name || '',
      emergency_phone: s.emergency_phone || ''
    });
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalState.name.trim() || !modalState.emp_code.trim()) return;

    if (modalState.editId) {
      updateStaff(modalState.editId, {
        name: modalState.name.trim(),
        phone: modalState.phone.trim(),
        address: modalState.address.trim(),
        department: modalState.department,
        sub_role: modalState.sub_role,
        salary: Number(modalState.salary),
        emergency_name: modalState.emergency_name.trim(),
        emergency_phone: modalState.emergency_phone.trim()
      });
    } else {
      saveStaff({
        emp_code: modalState.emp_code.trim().toUpperCase(),
        name: modalState.name.trim(),
        cnic: modalState.cnic.trim(),
        phone: modalState.phone.trim(),
        address: modalState.address.trim(),
        department: modalState.department,
        sub_role: modalState.sub_role,
        salary: Number(modalState.salary),
        emergency_name: modalState.emergency_name.trim(),
        emergency_phone: modalState.emergency_phone.trim()
      });
    }

    setModalState(prev => ({ ...prev, open: false }));
  };

  // Filter staff
  const filteredStaff = staff.filter(s => {
    if (selectedDeptFilter !== 'All' && s.department !== selectedDeptFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.emp_code.toLowerCase().includes(q) ||
        s.cnic.includes(q) ||
        s.phone.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Staff Personnel Directory (/hr/staff)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Departmental tracking across PPC, Lot Making, and Fabric Store with role-based salary calculations and ledger histories.
          </p>
        </div>

        <button
          onClick={openNewStaffModal}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm self-start"
        >
          <UserPlus className="w-4 h-4 text-emerald-400" />
          Add Personnel
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Department:</span>
          {(['All', 'PPC', 'Lot Making', 'Fabric Store'] as const).map(d => (
            <button
              key={d}
              onClick={() => setSelectedDeptFilter(d)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                selectedDeptFilter === d
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Name, Code, CNIC, Phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Staff Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {filteredStaff.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No staff members found matching your search.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Emp Code</th>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4">Department</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">CNIC</th>
                  <th className="py-2.5 px-4">Phone</th>
                  <th className="py-2.5 px-4">Fixed Salary</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {s.emp_code}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{s.name}</span>
                      {s.emergency_name && (
                        <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                          Emerg: {s.emergency_name} ({s.emergency_phone})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {s.department}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {s.sub_role}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {s.cnic}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {s.phone}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      Rs. {s.salary.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenLedger(s.id)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="View Financial Advances & Fines Ledger"
                        >
                          <Wallet className="w-3 h-3 text-amber-700" />
                          Ledger
                        </button>
                        <button
                          onClick={() => openEditStaffModal(s)}
                          className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded"
                          title="Edit Profile"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Staff Add/Edit Modal (hr/profile.html & hr/staff.html) */}
      {modalState.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-slate-900 mb-4 pb-2 border-b border-slate-100">
              {modalState.editId ? `Edit Personnel: ${modalState.name}` : 'Register New Staff Member'}
            </h3>

            <form onSubmit={handleSaveStaff} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Emp Code *</label>
                  <input
                    type="text"
                    required
                    disabled={!!modalState.editId}
                    placeholder="e.g. TF-105"
                    value={modalState.emp_code}
                    onChange={e => setModalState({ ...modalState, emp_code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Muhammad Asif"
                    value={modalState.name}
                    onChange={e => setModalState({ ...modalState, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                  <select
                    value={modalState.department}
                    onChange={e => setModalState({ ...modalState, department: e.target.value as Department })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="PPC">PPC</option>
                    <option value="Lot Making">Lot Making</option>
                    <option value="Fabric Store">Fabric Store</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sub-Role *</label>
                  <select
                    value={modalState.sub_role}
                    onChange={e => setModalState({ ...modalState, sub_role: e.target.value as SubRole })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="Helper">Helper</option>
                    <option value="Clerk">Clerk</option>
                    <option value="Incharge">Incharge</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CNIC Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="35201-XXXXXXX-X"
                    value={modalState.cnic}
                    onChange={e => setModalState({ ...modalState, cnic: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="0300-XXXXXXX"
                    value={modalState.phone}
                    onChange={e => setModalState({ ...modalState, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fixed Monthly Salary (Rs.) *</label>
                  <input
                    type="number"
                    required
                    placeholder="45000"
                    value={modalState.salary}
                    onChange={e => setModalState({ ...modalState, salary: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Phone</label>
                  <input
                    type="text"
                    placeholder="0321-XXXXXXX"
                    value={modalState.emergency_phone}
                    onChange={e => setModalState({ ...modalState, emergency_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Tariq Mehmood (Brother)"
                  value={modalState.emergency_name}
                  onChange={e => setModalState({ ...modalState, emergency_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  placeholder="e.g. House 14, Street 2, Millat Town, Faisalabad"
                  value={modalState.address}
                  onChange={e => setModalState({ ...modalState, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalState(prev => ({ ...prev, open: false }))}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Save Personnel Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
