import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileSpreadsheet, Download, Filter, Layers, CheckCircle2,
  AlertCircle, Table
} from 'lucide-react';

export const ReportsMenuView: React.FC = () => {
  const {
    workOrders, plans, bags, lots, rolls, qualityChecks,
    finalizedBags, dispatchRecords
  } = useApp();

  const [selectedWo, setSelectedWo] = useState<string>(workOrders[0]?.work_order || '');

  // Build the Detailed Plan Report exactly as defined in export_plan_report in main.py:
  const woLots = lots.filter(l => {
    const bag = bags.find(b => b.id === l.bag_id);
    if (!bag) return false;
    const plan = plans.find(p => p.id === bag.plan_id);
    if (!plan) return false;
    const wo = workOrders.find(w => w.id === plan.work_order_id);
    return wo?.work_order === selectedWo;
  });

  const dispatchedBags = dispatchRecords.map(d => d.bag_number);
  const finalizedBagList = finalizedBags.filter(fb => fb.work_order === selectedWo).map(fb => fb.bag_number);

  const reportRows = woLots.map(l => {
    const bag = bags.find(b => b.id === l.bag_id)!;
    const plan = plans.find(p => p.id === bag.plan_id)!;

    // Produced Qty & total fitted rolls
    const lotRolls = rolls.filter(r => r.bag_number === bag.bag_number && r.lot_name === l.lot_name);
    const totalProducedQty = lotRolls.reduce((sum, r) => sum + r.weight, 0);
    const totalFittedCount = lotRolls.length;

    // Quality stats (A-Grade and B-Grade)
    const rollBarcodes = lotRolls.map(r => r.roll_barcode);
    const lotQcs = qualityChecks.filter(qc => rollBarcodes.includes(qc.roll_id));
    const prodAWeight = lotQcs.reduce((sum, q) => sum + q.grade_a_weight, 0);
    const rollsQcDoneCount = lotQcs.length;
    const prodBWeight = lotQcs.reduce((sum, q) => sum + q.grade_b_weight, 0);

    // Status Hierarchy matching main.py lines 2127-2137:
    let statusText = 'Qty pending';
    if (dispatchedBags.includes(bag.bag_number)) {
      statusText = 'dispatched';
    } else if (finalizedBagList.includes(bag.bag_number)) {
      statusText = 'waiting for dispatch';
    } else if (totalFittedCount > 0 && rollsQcDoneCount >= totalFittedCount) {
      statusText = 'waiting for creation';
    } else if (rollsQcDoneCount > 0) {
      statusText = 'wait for stock';
    }

    return {
      wo: selectedWo,
      plan: plan.plan_id,
      bag: bag.bag_number,
      shade: bag.shade,
      needles: l.needles,
      lot: l.lot_name,
      plan_wt: l.plan_weight,
      rolls: totalFittedCount,
      prod: totalProducedQty,
      a_count: rollsQcDoneCount,
      balance: l.fabric_weight,
      b_wt: prodBWeight,
      status: statusText
    };
  });

  // Export CSV matching 13 columns in main.py
  const handleExportCsv = () => {
    const columns = [
      'Work Order',
      'Plan ID',
      'Bag Number',
      'Shade',
      'Needles',
      'Lot Name',
      'Plan Weight (KG)',
      'Fitted Rolls',
      'Produced Qty (KG)',
      'A-Grade Rolls',
      'Balance Qty (KG)',
      'B-Grade Weight (KG)',
      'Bag Status'
    ];

    const rows = reportRows.map(r => [
      r.wo,
      r.plan,
      r.bag,
      r.shade,
      r.needles,
      r.lot,
      r.plan_wt.toFixed(2),
      r.rolls,
      r.prod.toFixed(2),
      r.a_count,
      r.balance.toFixed(2),
      r.b_wt.toFixed(2),
      r.status
    ]);

    const csvContent = [columns.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Detailed_Plan_Report_${selectedWo}_${new Date().toISOString().split('T')[0]}.csv`);
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
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Detailed Production Plan Reports (/reports)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Export comprehensive 13-column manufacturing reports covering planned targets, fitted rolls, A/B grade breakdown, and status hierarchy.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors self-start"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          Download Excel (XLSX / CSV)
        </button>
      </div>

      {/* WO Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-4">
        <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
          Filter Work Order:
        </label>
        <select
          value={selectedWo}
          onChange={e => setSelectedWo(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden max-w-xs w-full"
        >
          {workOrders.map(w => (
            <option key={w.id} value={w.work_order}>
              {w.work_order}
            </option>
          ))}
        </select>
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Table className="w-4 h-4 text-slate-500" />
            Report Data Preview &mdash; {selectedWo}
          </h2>
          <span className="text-xs font-mono text-slate-500">
            {reportRows.length} Lot Items
          </span>
        </div>

        <div className="overflow-x-auto">
          {reportRows.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No lots or plans recorded for {selectedWo}.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Plan & Bag</th>
                  <th className="py-2.5 px-3">Shade</th>
                  <th className="py-2.5 px-3">Needles</th>
                  <th className="py-2.5 px-3">Lot Name</th>
                  <th className="py-2.5 px-3 text-right">Plan Wt</th>
                  <th className="py-2.5 px-3 text-center">Fitted Rolls</th>
                  <th className="py-2.5 px-3 text-right">Produced Qty</th>
                  <th className="py-2.5 px-3 text-center">A-Grade</th>
                  <th className="py-2.5 px-3 text-right">Balance</th>
                  <th className="py-2.5 px-3 text-right">B-Grade</th>
                  <th className="py-2.5 px-3 text-center">Bag Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportRows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {r.plan} / {r.bag}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      {r.shade}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {r.needles}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      {r.lot}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right font-semibold text-slate-800">
                      {r.plan_wt.toFixed(1)} KG
                    </td>
                    <td className="py-2.5 px-3 font-mono text-center font-bold">
                      {r.rolls}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right font-bold text-emerald-800">
                      {r.prod.toFixed(1)} KG
                    </td>
                    <td className="py-2.5 px-3 font-mono text-center text-slate-700">
                      {r.a_count}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-amber-800 font-bold">
                      {r.balance.toFixed(1)} KG
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-slate-500">
                      {r.b_wt > 0 ? `${r.b_wt.toFixed(1)} KG` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        r.status === 'dispatched'
                          ? 'bg-amber-100 text-amber-900'
                          : r.status === 'waiting for dispatch'
                          ? 'bg-blue-100 text-blue-900'
                          : r.status === 'waiting for creation'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
