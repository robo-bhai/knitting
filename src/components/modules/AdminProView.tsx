import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import {
  ShieldAlert, UserPlus, Key, Trash2, ShieldCheck,
  CheckCircle2, AlertOctagon, TrendingUp, Layers, Weight
} from 'lucide-react';

export const AdminProView: React.FC = () => {
  const {
    users, rolls, dispatchRecords, lots, qualityChecks,
    addUser, deleteUser, updateUserPassword
  } = useApp();

  // New user form state
  const [newUsername, setNewUsername] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newRole, setNewRole] = useState<UserRole>('clerk');

  // Change password modal state
  const [passModal, setPassModal] = useState<{ open: boolean; userId?: number; username?: string; newPass: string }>({
    open: false,
    newPass: ''
  });

  const totalProduction = rolls.reduce((sum, r) => sum + r.weight, 0);
  const totalDispatched = dispatchRecords.length;
  const activePlans = new Set(lots.map(l => l.bag_id)).size;

  const totalGradeA = qualityChecks.reduce((sum, q) => sum + q.grade_a_weight, 0);
  const totalGradeB = qualityChecks.reduce((sum, q) => sum + q.grade_b_weight, 0);
  const totalChecked = totalGradeA + totalGradeB;
  const gradeARatio = totalChecked > 0 ? ((totalGradeA / totalChecked) * 100).toFixed(1) : '100';

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    addUser(newUsername.trim(), newRole, newPassword || 'pass123');
    setNewUsername('');
    setNewPassword('');
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passModal.userId || !passModal.newPass.trim()) return;
    updateUserPassword(passModal.userId, passModal.newPass.trim());
    setPassModal({ open: false, newPass: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
              System Administration • Server Healthy
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Admin Pro Control Center (/admin)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Access-restricted management for authentication, user privilege delegation, and high-level factory KPIs.
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Server Load: Normal (0% Delay)</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
            Engine: High-Speed DB Active
          </div>
        </div>
      </div>

      {/* Admin Monitoring KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Mill Production</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{totalProduction.toFixed(2)} KG</div>
          <span className="text-xs text-slate-400 font-mono mt-1 block">{rolls.length} rolls manufactured</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Dispatches</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{totalDispatched} Bags</div>
          <span className="text-xs text-emerald-600 font-medium mt-1 block">Gate passes issued</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active PPC Bag Lines</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{activePlans} Bags</div>
          <span className="text-xs text-indigo-600 font-medium mt-1 block">In production pipeline</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Grade-A Quality Yield</span>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">{gradeARatio}%</div>
          <span className="text-xs text-slate-500 font-mono mt-1 block">
            A: {totalGradeA.toFixed(1)} KG | B: {totalGradeB.toFixed(1)} KG
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Creation Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h2 className="font-bold text-sm text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-600" />
            Provision System User
          </h2>

          <form onSubmit={handleAddUser} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username / Login ID *</label>
              <input
                type="text"
                required
                placeholder="e.g. clerk_shift1, manager2"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Security Role *</label>
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="clerk">CLERK (Roll Entry, Fabric Store)</option>
                <option value="incharge">INCHARGE (Attendance, QC, Machine Sign)</option>
                <option value="manager">MANAGER (PPC Tree, Staff, Quality, Reports)</option>
                <option value="admin">ADMIN (Full Access, User Management, Payroll)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Temporary Password</label>
              <input
                type="password"
                placeholder="Default: pass123"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-colors mt-2"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              Create User Account
            </button>
          </form>
        </div>

        {/* Existing Users Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <div className="pb-3 mb-3 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-sm text-slate-900">User Access Control List</h2>
              <p className="text-xs text-slate-500">Active role assignments enforcing @role_required gates</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700">{users.length} Users</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">User ID</th>
                  <th className="py-2.5 px-3">Username</th>
                  <th className="py-2.5 px-3">Role Designation</th>
                  <th className="py-2.5 px-3">Permissions Scope</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      #{u.id}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 font-mono">
                      {u.username}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'admin'
                          ? 'bg-rose-100 text-rose-900'
                          : u.role === 'manager'
                          ? 'bg-purple-100 text-purple-900'
                          : u.role === 'incharge'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                      {u.role === 'admin'
                        ? 'Full Root Access & HR Payroll'
                        : u.role === 'manager'
                        ? 'PPC Tree, Lots, Dispatch, Staff'
                        : u.role === 'incharge'
                        ? 'Attendance, QC, Machine Assignment'
                        : 'Roll Entry, Store Scan'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPassModal({ open: true, userId: u.id, username: u.username, newPass: '' })}
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                          title="Change Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Revoke and delete user "${u.username}"?`)) deleteUser(u.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {passModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 mb-2">Update Password</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter a new secure password for user <strong className="text-slate-900">{passModal.username}</strong>.
            </p>
            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="New password..."
                  value={passModal.newPass}
                  onChange={e => setPassModal({ ...passModal, newPass: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPassModal({ open: false, newPass: '' })}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
