import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Receipt, Download, DollarSign, Users, Calendar,
  ArrowDownRight, CheckCircle2, FileSpreadsheet
} from 'lucide-react';

export const HrPayrollView: React.FC = () => {
  const { staff, attendance, ledger } = useApp();

  const [selectedMonth, setSelectedMonth] = useState<string>('10');
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  // Month Names
  const months = [
    { num: '01', name: 'January' },
    { num: '02', name: 'February' },
    { num: '03', name: 'March' },
    { num: '04', name: 'April' },
    { num: '05', name: 'May' },
    { num: '06', name: 'June' },
    { num: '07', name: 'July' },
    { num: '08', name: 'August' },
    { num: '09', name: 'September' },
    { num: '10', name: 'October' },
    { num: '11', name: 'November' },
    { num: '12', name: 'December' },
  ];

  // Active staff
  const activeStaff = staff.filter(s => s.status === 'Active');

  // Compute payroll report matching hr_payroll route in main.py
  const report = activeStaff.map(s => {
    // 1. Count Attendance: Present count + 0.5 * Half-Day
    const staffAtt = attendance.filter(a => {
      if (a.staff_id !== s.id) return false;
      const [year, month] = a.date.split('-');
      return month === selectedMonth && year === selectedYear;
    });
    const presentDays = staffAtt.filter(a => a.status === 'Present').length;
    const halfDays = staffAtt.filter(a => a.status === 'Half-Day').length;
    const effectiveDays = presentDays + (halfDays * 0.5);

    // 2. Sum Advances and Fines
    const staffLedger = ledger.filter(l => {
      if (l.staff_id !== s.id) return false;
      const [year, month] = l.date.split('-');
      return month === selectedMonth && year === selectedYear;
    });

    const advances = staffLedger
      .filter(l => l.type === 'Advance')
      .reduce((sum, l) => sum + l.amount, 0);

    const fines = staffLedger
      .filter(l => l.type === 'Fine')
      .reduce((sum, l) => sum + l.amount, 0);

    const bonuses = staffLedger
      .filter(l => l.type === 'Bonus')
      .reduce((sum, l) => sum + l.amount, 0);

    // 3. Calculation logic from main.py:
    // daily_rate = s['salary'] / 30
    // gross_salary = daily_rate * p_days
    // net_salary = gross_salary - advances - fines + bonuses
    const dailyRate = s.salary / 30;
    const grossSalary = dailyRate * (effectiveDays > 0 ? effectiveDays : 26); // fallback to standard 26 workdays if attendance not logged
    const netSalary = Math.max(0, grossSalary - advances - fines + bonuses);

    return {
      id: s.id,
      emp_code: s.emp_code,
      name: s.name,
      dept: s.department,
      base: s.salary,
      presentDays: effectiveDays > 0 ? effectiveDays : 26,
      advances,
      fines,
      bonuses,
      net: Math.round(netSalary)
    };
  });

  const totalBase = report.reduce((sum, r) => sum + r.base, 0);
  const totalAdvances = report.reduce((sum, r) => sum + r.advances, 0);
  const totalFines = report.reduce((sum, r) => sum + r.fines, 0);
  const totalNet = report.reduce((sum, r) => sum + r.net, 0);

  // CSV Export
  const handleExportCsv = () => {
    const headers = [
      'Emp Code',
      'Name',
      'Department',
      'Base Monthly Salary',
      'Worked Days',
      'Advances Deducted',
      'Fines Deducted',
      'Bonuses',
      'Net Salary Payable'
    ];

    const rows = report.map(r => [
      r.emp_code,
      r.name,
      r.dept,
      r.base,
      r.presentDays,
      r.advances,
      r.fines,
      r.bonuses,
      r.net
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Payroll_Report_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Monthly Payroll Report (/hr/payroll)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated 30-day formula: <code className="font-mono text-emerald-800 bg-emerald-50 px-1 rounded">(Salary / 30) &times; Present Days &minus; Advances &minus; Fines + Bonuses</code>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month / Year Selectors */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 p-1.5 rounded-lg text-xs">
            <Calendar className="w-4 h-4 text-slate-500 ml-1" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden"
            >
              {months.map(m => (
                <option key={m.num} value={m.num}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden"
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export Payroll Sheet
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Base Salary</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
            Rs. {totalBase.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400">{activeStaff.length} Employees</span>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Advances Recovered</span>
          <span className="text-xl font-bold font-mono text-amber-950 mt-1 block">
            Rs. {totalAdvances.toLocaleString()}
          </span>
          <span className="text-[11px] text-amber-700">Deducted from gross</span>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">Fines Deducted</span>
          <span className="text-xl font-bold font-mono text-rose-950 mt-1 block">
            Rs. {totalFines.toLocaleString()}
          </span>
          <span className="text-[11px] text-rose-700">Penalties</span>
        </div>

        <div className="bg-emerald-500 text-white p-4 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 block">Net Payable Payroll</span>
          <span className="text-2xl font-black font-mono mt-1 block">
            Rs. {totalNet.toLocaleString()}
          </span>
          <span className="text-[11px] text-emerald-100">Ready for bank disbursal</span>
        </div>
      </div>

      {/* Payroll Table (hr/payroll_report.html) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-sm text-slate-900">
            Payroll Ledger for {months.find(m => m.num === selectedMonth)?.name} {selectedYear}
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Generated at {new Date().toLocaleDateString()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Emp Code</th>
                <th className="py-2.5 px-4">Staff Member</th>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4 text-right">Base Salary</th>
                <th className="py-2.5 px-4 text-center">Days Worked</th>
                <th className="py-2.5 px-4 text-right">Advances</th>
                <th className="py-2.5 px-4 text-right">Fines</th>
                <th className="py-2.5 px-4 text-right">Bonuses</th>
                <th className="py-2.5 px-4 text-right">Net Payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {r.emp_code}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {r.name}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                      {r.dept}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-right text-slate-700">
                    Rs. {r.base.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                    {r.presentDays} days
                  </td>
                  <td className="py-3 px-4 font-mono text-right text-amber-800">
                    {r.advances > 0 ? `-Rs. ${r.advances.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-3 px-4 font-mono text-right text-rose-800">
                    {r.fines > 0 ? `-Rs. ${r.fines.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-3 px-4 font-mono text-right text-emerald-700 font-semibold">
                    {r.bonuses > 0 ? `+Rs. ${r.bonuses.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-3 px-4 font-mono text-right font-black text-sm text-slate-900">
                    Rs. {r.net.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
              <tr>
                <td colSpan={3} className="py-3 px-4 uppercase tracking-wider font-mono">
                  Monthly Total
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  Rs. {totalBase.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-center font-mono">-</td>
                <td className="py-3 px-4 text-right font-mono text-amber-900">
                  -Rs. {totalAdvances.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right font-mono text-rose-900">
                  -Rs. {totalFines.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right font-mono text-emerald-800">
                  +Rs. {report.reduce((sum, r) => sum + r.bonuses, 0).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right font-mono text-base font-black text-emerald-700">
                  Rs. {totalNet.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
