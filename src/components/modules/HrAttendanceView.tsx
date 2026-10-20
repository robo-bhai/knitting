import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AttendanceStatus } from '../../types';
import {
  CalendarCheck, CheckCircle2, XCircle, Clock,
  Calendar, Users, Filter, Save
} from 'lucide-react';

export const HrAttendanceView: React.FC = () => {
  const { staff, attendance, saveDailyAttendance } = useApp();

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedDept, setSelectedDept] = useState<string>('All');

  // Active staff
  const activeStaff = staff.filter(s => s.status === 'Active');

  // Existing attendance for the date
  const existingForDate = attendance.filter(a => a.date === selectedDate);

  // Local state for the attendance form
  const [statuses, setStatuses] = useState<{ [staffId: number]: AttendanceStatus }>(() => {
    const map: { [id: number]: AttendanceStatus } = {};
    activeStaff.forEach(s => {
      const found = existingForDate.find(a => a.staff_id === s.id);
      map[s.id] = found ? found.status : 'Present';
    });
    return map;
  });

  const handleStatusChange = (staffId: number, status: AttendanceStatus) => {
    setStatuses(prev => ({ ...prev, [staffId]: status }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: { [id: number]: AttendanceStatus } = {};
    activeStaff.forEach(s => {
      updated[s.id] = status;
    });
    setStatuses(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const records = activeStaff.map(s => ({
      staff_id: s.id,
      status: statuses[s.id] || 'Present'
    }));
    saveDailyAttendance(records, selectedDate);
  };

  // Metrics
  const totalCount = activeStaff.length;
  const presentCount = Object.values(statuses).filter(s => s === 'Present').length;
  const absentCount = Object.values(statuses).filter(s => s === 'Absent').length;
  const halfDayCount = Object.values(statuses).filter(s => s === 'Half-Day').length;

  const filteredStaff = activeStaff.filter(
    s => selectedDept === 'All' || s.department === selectedDept
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Daily Attendance Marking (/hr/attendance)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track daily factory floor attendance department-wise. Feed payroll calculations automatically.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 p-1.5 rounded-lg">
          <Calendar className="w-4 h-4 text-slate-500 ml-1" />
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-hidden"
          />
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Active Workforce</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{totalCount}</div>
        </div>
        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-xs text-emerald-800 font-medium uppercase tracking-wider">Present</span>
          <div className="text-2xl font-bold font-mono text-emerald-900 mt-1">{presentCount}</div>
        </div>
        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-xs text-amber-800 font-medium uppercase tracking-wider">Half-Day</span>
          <div className="text-2xl font-bold font-mono text-amber-900 mt-1">{halfDayCount}</div>
        </div>
        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-2xs">
          <span className="text-xs text-rose-800 font-medium uppercase tracking-wider">Absent</span>
          <div className="text-2xl font-bold font-mono text-rose-900 mt-1">{absentCount}</div>
        </div>
      </div>

      {/* Attendance Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Filter:</span>
            {(['All', 'PPC', 'Lot Making', 'Fabric Store'] as const).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDept(d)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  selectedDept === d
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Quick Mark Shortcuts */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleMarkAll('Present')}
              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
            >
              Mark All Present
            </button>
            <button
              type="button"
              onClick={() => handleMarkAll('Absent')}
              className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors"
            >
              Mark All Absent
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Emp Code</th>
                  <th className="py-2.5 px-4">Staff Member</th>
                  <th className="py-2.5 px-4">Department & Role</th>
                  <th className="py-2.5 px-4 text-center">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map(s => {
                  const status = statuses[s.id] || 'Present';
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {s.emp_code}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{s.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{s.phone}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800">{s.department}</span>
                        <span className="text-slate-400 mx-1">&bull;</span>
                        <span className="text-slate-500">{s.sub_role}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, 'Present')}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                              status === 'Present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, 'Half-Day')}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                              status === 'Half-Day'
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Half-Day
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, 'Absent')}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                              status === 'Absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              Save Attendance for {selectedDate}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
