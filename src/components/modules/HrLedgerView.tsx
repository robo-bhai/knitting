import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Wallet, Plus, DollarSign, ArrowDownRight, ArrowUpRight,
  User, Calendar, Clock, AlertCircle, FileText
} from 'lucide-react';

interface Props {
  initialStaffId?: number | null;
}

export const HrLedgerView: React.FC<Props> = ({ initialStaffId }) => {
  const { staff, ledger, addLedgerEntry } = useApp();

  const [selectedStaffId, setSelectedStaffId] = useState<number>(initialStaffId || staff[0]?.id || 1);
  const [amountInput, setAmountInput] = useState<string>('2000');
  const [typeInput, setTypeInput] = useState<'Advance' | 'Fine' | 'Bonus'>('Advance');
  const [descInput, setDescInput] = useState<string>('Fuel & grocery advance');

  const selectedStaff = staff.find(s => s.id === selectedStaffId);
  const staffLedger = ledger.filter(l => l.staff_id === selectedStaffId);

  const totalAdvances = staffLedger
    .filter(l => l.type === 'Advance')
    .reduce((sum, l) => sum + l.amount, 0);

  const totalFines = staffLedger
    .filter(l => l.type === 'Fine')
    .reduce((sum, l) => sum + l.amount, 0);

  const totalBonuses = staffLedger
    .filter(l => l.type === 'Bonus')
    .reduce((sum, l) => sum + l.amount, 0);

  const netDeductions = totalAdvances + totalFines - totalBonuses;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amountInput);
    if (isNaN(amt) || amt <= 0 || !descInput.trim()) return;

    addLedgerEntry(selectedStaffId, amt, typeInput, descInput.trim());
    setAmountInput('');
    setDescInput('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Staff Financial Ledger (/hr/ledger)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Record employee salary advances, penalties, and performance bonuses with automatic payroll deduction.
          </p>
        </div>

        {/* Staff Selector */}
        <div className="min-w-64">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Select Employee</label>
          <select
            value={selectedStaffId}
            onChange={e => setSelectedStaffId(parseInt(e.target.value, 10))}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          >
            {staff.map(s => (
              <option key={s.id} value={s.id}>
                {s.emp_code} - {s.name} ({s.department})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Ledger Cards */}
      {selectedStaff && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Base Monthly Salary</span>
            <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
              Rs. {selectedStaff.salary.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Daily rate: Rs. {(selectedStaff.salary / 30).toFixed(0)}
            </span>
          </div>

          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-amber-800 block">Total Advances</span>
            <span className="text-xl font-bold font-mono text-amber-950 mt-1 block">
              Rs. {totalAdvances.toLocaleString()}
            </span>
            <span className="text-[10px] text-amber-700 font-mono">Recoverable from payroll</span>
          </div>

          <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-rose-800 block">Total Fines</span>
            <span className="text-xl font-bold font-mono text-rose-950 mt-1 block">
              Rs. {totalFines.toLocaleString()}
            </span>
            <span className="text-[10px] text-rose-700 font-mono">Deductions</span>
          </div>

          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-emerald-800 block">Bonuses Credited</span>
            <span className="text-xl font-bold font-mono text-emerald-950 mt-1 block">
              Rs. {totalBonuses.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-700 font-mono">Incentives added</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entry Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h2 className="font-bold text-sm text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            Log Ledger Transaction
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Entry Type *</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Advance', 'Fine', 'Bonus'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTypeInput(t)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      typeInput === t
                        ? t === 'Advance'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                          : t === 'Fine'
                          ? 'bg-rose-600 text-white font-black shadow-xs'
                          : 'bg-emerald-600 text-white font-black shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (Rs.) *</label>
              <input
                type="number"
                required
                min="50"
                step="50"
                placeholder="2000"
                value={amountInput}
                onChange={e => setAmountInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Reason *</label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Salary advance for medical emergency..."
                value={descInput}
                onChange={e => setDescInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Wallet className="w-4 h-4 text-emerald-400" />
              Save {typeInput}
            </button>
          </form>
        </div>

        {/* Ledger History Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <div className="pb-3 mb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-slate-900">
                Transaction History ({staffLedger.length})
              </h2>
              <span className="text-xs text-slate-500">
                Employee: {selectedStaff?.name} ({selectedStaff?.emp_code})
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Net Deduction</span>
              <span className="font-mono font-bold text-sm text-rose-700">
                -Rs. {netDeductions.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            {staffLedger.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No ledger transactions recorded for this employee yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffLedger.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {l.date}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          l.type === 'Advance'
                            ? 'bg-amber-100 text-amber-900'
                            : l.type === 'Fine'
                            ? 'bg-rose-100 text-rose-900'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {l.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        Rs. {l.amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {l.description}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500 text-[11px]">
                        {l.created_by}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
