import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CalendarCheck, Filter, Edit3, Trash2, Lock, CheckCircle,
  AlertCircle, ShieldCheck, Scale, ArrowRight, Layers
} from 'lucide-react';

export const RollWiseView: React.FC = () => {
  const {
    workOrders, bags, jobs, rolls, qualityChecks, finalizedBags, lots,
    editRoll, deleteRoll
  } = useApp();

  // Filters
  const [selectedWo, setSelectedWo] = useState<string>(workOrders[0]?.work_order || '');
  const [selectedShade, setSelectedShade] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<string>('');

  // Edit Modal State
  const [editModal, setEditModal] = useState<{ open: boolean; rollId?: number; rollNo?: number; currentWeight: number; newWeight: string }>({
    open: false,
    currentWeight: 0,
    newWeight: ''
  });

  // Available shades for WO
  const availableShades = Array.from(
    new Set(
      jobs
        .filter(j => !selectedWo || j.work_order_ref === selectedWo)
        .map(j => j.shade_ref)
    )
  );

  // Available jobs for WO & Shade
  const availableJobs = jobs.filter(
    j => (!selectedWo || j.work_order_ref === selectedWo) &&
         (!selectedShade || j.shade_ref === selectedShade)
  );

  // Filtered rolls matching the query logic in roll_wise route:
  // WHERE wo.work_order = ? AND b.shade = ? AND r.needles LIKE ?
  const targetJobObj = jobs.find(
    j => j.work_order_ref === selectedWo &&
         j.shade_ref === selectedShade &&
         j.job.toString() === selectedJob
  );

  const filteredRolls = rolls.filter(r => {
    if (selectedWo && r.work_order !== selectedWo) return false;
    if (selectedShade) {
      const bag = bags.find(b => b.bag_number === r.bag_number);
      if (bag?.shade !== selectedShade) return false;
    }
    if (targetJobObj) {
      const targetNeedles = targetJobObj.needles_ref.toUpperCase().replace('N', '').trim();
      if (!r.needles.toUpperCase().startsWith(targetNeedles)) return false;
    }
    return true;
  });

  // KPI Calculations
  const producedWeight = filteredRolls.reduce((sum, r) => sum + r.weight, 0);

  // Remaining lot balance for this combo
  const matchingLots = lots.filter(l => {
    const bag = bags.find(b => b.id === l.bag_id);
    if (!bag) return false;
    if (selectedShade && bag.shade !== selectedShade) return false;
    if (targetJobObj) {
      const targetNeedles = targetJobObj.needles_ref.toUpperCase().replace('N', '').trim();
      if (!l.needles.toUpperCase().startsWith(targetNeedles)) return false;
    }
    return true;
  });
  const currentBalance = matchingLots.reduce((sum, l) => sum + l.fabric_weight, 0);
  const plannedWeight = producedWeight + currentBalance;

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.rollId) return;
    const weight = parseFloat(editModal.newWeight);
    if (isNaN(weight) || weight <= 0) return;

    editRoll(editModal.rollId, weight);
    setEditModal({ open: false, currentWeight: 0, newWeight: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Roll-Wise Production Tracking</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Detailed inspection of all individual rolls. Balance auto-restores on roll deletion or weight adjustments. Locked if bag is Finalized/Dispatched.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Work Order</label>
            <select
              value={selectedWo}
              onChange={e => {
                setSelectedWo(e.target.value);
                setSelectedShade('');
                setSelectedJob('');
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="">All Work Orders</option>
              {workOrders.map(w => (
                <option key={w.id} value={w.work_order}>
                  {w.work_order}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fabric Shade</label>
            <select
              value={selectedShade}
              onChange={e => {
                setSelectedShade(e.target.value);
                setSelectedJob('');
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="">All Shades</option>
              {availableShades.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Job</label>
            <select
              value={selectedJob}
              onChange={e => setSelectedJob(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="">All Jobs</option>
              {availableJobs.map(j => (
                <option key={j.id} value={j.job}>
                  Job #{j.job} ({j.needles_ref})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100 text-center text-xs">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-slate-500 uppercase text-[10px] font-bold block">Planned Weight</span>
            <span className="text-sm font-bold font-mono text-slate-900">{plannedWeight.toFixed(2)} KG</span>
          </div>
          <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
            <span className="text-emerald-700 uppercase text-[10px] font-bold block">Produced Weight</span>
            <span className="text-sm font-bold font-mono text-emerald-950">{producedWeight.toFixed(2)} KG</span>
          </div>
          <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200">
            <span className="text-amber-800 uppercase text-[10px] font-bold block">Current Balance</span>
            <span className="text-sm font-bold font-mono text-amber-950">{currentBalance.toFixed(2)} KG</span>
          </div>
        </div>
      </div>

      {/* Rolls Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-sm text-slate-900">
            Recorded Rolls ({filteredRolls.length})
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Showing filtered manufacturing records
          </span>
        </div>

        <div className="overflow-x-auto">
          {filteredRolls.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No rolls found matching the selected filters.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-semibold border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Roll #</th>
                  <th className="py-2.5 px-3">Barcode</th>
                  <th className="py-2.5 px-3">Needles</th>
                  <th className="py-2.5 px-3">Machine</th>
                  <th className="py-2.5 px-3">Bag Number</th>
                  <th className="py-2.5 px-3">Produced Wt (PW)</th>
                  <th className="py-2.5 px-3">Quality Wt (QW)</th>
                  <th className="py-2.5 px-3">Store Status</th>
                  <th className="py-2.5 px-3">Bag Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRolls.map(r => {
                  const qc = qualityChecks.find(q => q.roll_id === r.roll_barcode);
                  const fb = finalizedBags.find(b => b.bag_number === r.bag_number);
                  const bagStatus = fb ? fb.status : 'Pending';
                  const isLocked = bagStatus === 'Finalized' || bagStatus === 'Dispatched';

                  let storeBadge = <span className="text-slate-400 text-[10px]">Production</span>;
                  if (qc?.in_store === 1) {
                    storeBadge = <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-bold">In Store</span>;
                  } else if (qc?.in_store === 2) {
                    storeBadge = <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-bold">Dispatched</span>;
                  }

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-bold font-mono text-slate-900">
                        #{r.roll_no}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {r.roll_barcode}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {r.needles}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 font-semibold text-[11px]">
                          {r.machine_no}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {r.bag_number}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {r.weight.toFixed(2)} KG
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {qc ? (
                          <span className="font-bold text-emerald-700">
                            {qc.grade_a_weight.toFixed(2)} KG
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Pending QC</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {storeBadge}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          bagStatus === 'Dispatched'
                            ? 'bg-amber-100 text-amber-900'
                            : bagStatus === 'Finalized'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {bagStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium" title={`Locked: Bag is ${bagStatus}`}>
                            <Lock className="w-3 h-3 text-slate-400" />
                            Locked
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditModal({
                                open: true,
                                rollId: r.id,
                                rollNo: r.roll_no,
                                currentWeight: r.weight,
                                newWeight: r.weight.toString()
                              })}
                              className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded"
                              title="Edit Roll Weight"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete Roll #${r.roll_no}? Weight will be restored to Lot balance.`)) {
                                  deleteRoll(r.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="Delete Roll"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Weight Modal */}
      {editModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 mb-2">Edit Roll #{editModal.rollNo} Weight</h3>
            <p className="text-xs text-slate-500 mb-4">
              Lot balance will be adjusted by the weight difference.
            </p>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Roll Weight (KG)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editModal.newWeight}
                  onChange={e => setEditModal({ ...editModal, newWeight: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModal({ open: false, currentWeight: 0, newWeight: '' })}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                >
                  Save & Adjust Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
