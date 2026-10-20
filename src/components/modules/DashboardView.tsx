import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Layers, Weight, FileText, Truck, ArrowUpRight,
  TrendingUp, Clock, AlertCircle, Cpu, CheckSquare, Plus
} from 'lucide-react';

interface Props {
  setActiveTab: (tab: string) => void;
}

export const DashboardView: React.FC<Props> = ({ setActiveTab }) => {
  const { rolls, finalizedBags, dispatchRecords, plans, lots, machineAssignments } = useApp();

  // Real-time calculations matching index route in main.py
  const totalRolls = rolls.length;
  const totalWeight = rolls.reduce((sum, r) => sum + r.weight, 0);
  const activePlansCount = plans.length;
  const totalDispatched = dispatchRecords.length;

  const totalLotPlannedWeight = lots.reduce((sum, l) => sum + l.plan_weight, 0);
  const totalRemainingBalance = lots.reduce((sum, l) => sum + l.fabric_weight, 0);
  const completionPercentage = totalLotPlannedWeight > 0
    ? Math.min(100, Math.round(((totalLotPlannedWeight - totalRemainingBalance) / totalLotPlannedWeight) * 100))
    : 0;

  // Recent 5 rolls
  const recentRolls = [...rolls].sort((a, b) => b.id - a.id).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
              Mill Live Production Monitoring
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Manufacturing Operations & PPC Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Real-time synchronization across Knitting Machine Sign-ins, Barcode Generation, Quality Inspection, and Dispatches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('roll_entry')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Roll Entry
          </button>
          <button
            onClick={() => setActiveTab('machine_sign')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            Machine Sign-In
          </button>
          <button
            onClick={() => setActiveTab('roll_quality')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
            Roll QC Scan
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Rolls */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Rolls Produced</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900">{totalRolls.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>Active in factory floor</span>
            </div>
          </div>
        </div>

        {/* Total Produced Weight */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Fabric Produced</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Weight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900">{totalWeight.toFixed(2)} <span className="text-sm font-normal text-slate-500">KG</span></div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium mt-1">
              <span>Remaining balance: {totalRemainingBalance.toFixed(1)} KG</span>
            </div>
          </div>
        </div>

        {/* Active Plans */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Production Plans</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900">{activePlansCount}</div>
            <div className="flex items-center gap-1 text-[11px] text-indigo-600 font-medium mt-1">
              <span>{lots.length} fabric lots scheduled</span>
            </div>
          </div>
        </div>

        {/* Dispatched Records */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Bags Dispatched</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900">{totalDispatched}</div>
            <div className="flex items-center gap-1 text-[11px] text-amber-700 font-medium mt-1">
              <span>{finalizedBags.filter(b => b.status === 'Finalized').length} bags waiting for dispatch</span>
            </div>
          </div>
        </div>
      </div>

      {/* Production Progress Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Overall PPC Target Progress</span>
            <span className="text-xs font-mono font-bold text-emerald-600">{completionPercentage}% Completed</span>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {(totalLotPlannedWeight - totalRemainingBalance).toFixed(1)} / {totalLotPlannedWeight.toFixed(1)} KG
          </span>
        </div>
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* 2-Column Section: Recent Rolls & Active Machines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Rolls Table (Matches index.html) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h2 className="font-bold text-sm text-slate-900">Recent Fabric Rolls Produced</h2>
            </div>
            <button
              onClick={() => setActiveTab('roll_wise')}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              View All Rolls
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            {recentRolls.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No rolls entered yet. Click "New Roll Entry" to scan the first roll barcode.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Roll Barcode</th>
                    <th className="py-2.5 px-4">Lot Name</th>
                    <th className="py-2.5 px-4">Weight (KG)</th>
                    <th className="py-2.5 px-4">Machine</th>
                    <th className="py-2.5 px-4">Created Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentRolls.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {r.roll_barcode}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-700">{r.lot_name}</td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">
                        {r.weight.toFixed(2)} KG
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">
                        <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {r.machine_no}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                        {r.created_at}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Machine Sign-In Status */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-slate-500" />
              <h2 className="font-bold text-sm text-slate-900">Active Knitting Machines</h2>
            </div>
            <button
              onClick={() => setActiveTab('machine_sign')}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
            >
              Sign-In
            </button>
          </div>

          <div className="p-4 flex-1 space-y-3">
            {machineAssignments.slice(0, 4).map(m => (
              <div
                key={m.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900">{m.machine_no}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Unit {m.unit_no}</span>
                  </div>
                  <span className="text-[11px] text-slate-600 font-mono block mt-0.5">
                    {m.job_full_text} ({m.needles})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">5-Digit Code</span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                    {m.unique_code}
                  </span>
                </div>
              </div>
            ))}

            {machineAssignments.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-xs">
                No active machines currently signed in.
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Codes are verified during Roll Entry to prevent job mismatches.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
