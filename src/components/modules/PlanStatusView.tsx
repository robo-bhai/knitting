import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CheckSquare, Download, CheckCircle2, AlertTriangle,
  Lock, ArrowRight, ShieldCheck, FileSpreadsheet, Eye, Truck
} from 'lucide-react';

interface PlanStatusViewProps {
  setActiveTab?: (tab: string) => void;
  onGoToDispatch?: () => void;
}

export const PlanStatusView: React.FC<PlanStatusViewProps> = ({ setActiveTab, onGoToDispatch }) => {
  const {
    workOrders, plans, bags, rolls, qualityChecks, finalizedBags,
    finalizeBag
  } = useApp();

  const [selectedWo, setSelectedWo] = useState<string>(workOrders[0]?.work_order || '');
  const [selectedBag, setSelectedBag] = useState<string>('');

  // Available bags for selected WO (from both PPC plans & actual fabric rolls)
  const woObj = workOrders.find(w => w.work_order.trim().toLowerCase() === selectedWo.trim().toLowerCase());
  const woPlans = woObj ? plans.filter(p => p.work_order_id === woObj.id || String(p.work_order_id) === String(woObj.id)) : [];
  const ppcBags = bags.filter(b => woPlans.some(p => p.id === b.plan_id || String(p.id) === String(b.plan_id)));

  const rollBags = Array.from(new Set(
    rolls.filter(r => (r.work_order || '').trim().toLowerCase() === selectedWo.trim().toLowerCase())
         .map(r => r.bag_number)
  )).filter(b => !ppcBags.some(pb => pb.bag_number.trim().toLowerCase() === b.trim().toLowerCase()));

  const allAvailableBags = [
    ...ppcBags.map(b => ({ bag_number: b.bag_number, shade: b.shade })),
    ...rollBags.map(b => ({ bag_number: b, shade: 'Production' }))
  ];

  // Clean bag name for robust case/trim matching
  const cleanBag = selectedBag.split('(')[0].trim().toLowerCase();

  // Rolls data for selected bag
  const bagRolls = selectedBag
    ? rolls.filter(r => (r.bag_number || '').split('(')[0].trim().toLowerCase() === cleanBag).sort((a, b) => a.roll_no - b.roll_no)
    : [];

  const finalizedRecord = finalizedBags.find(fb => (fb.bag_number || '').split('(')[0].trim().toLowerCase() === cleanBag);
  const isAlreadyFinalized = Boolean(finalizedRecord && (finalizedRecord.status === 'Finalized' || finalizedRecord.status === 'Dispatched'));
  const bagStatus = finalizedRecord?.status || 'Pending';

  // Check if all rolls have a quality check
  const allQcDone = bagRolls.length > 0 && bagRolls.every(r => qualityChecks.some(qc => qc.roll_id.trim().toLowerCase() === r.roll_barcode.trim().toLowerCase()));
  const readyToFinalize = allQcDone && !isAlreadyFinalized;

  // Auto-finalize bag as soon as all rolls are Quality Checked!
  useEffect(() => {
    if (readyToFinalize && selectedBag) {
      finalizeBag(selectedBag, selectedWo);
    }
  }, [readyToFinalize, selectedBag, selectedWo, finalizeBag]);

  const totalPw = bagRolls.reduce((sum, r) => sum + r.weight, 0);
  const totalQw = bagRolls.reduce((sum, r) => {
    const qc = qualityChecks.find(q => q.roll_id === r.roll_barcode);
    return sum + (qc ? qc.grade_a_weight : 0);
  }, 0);

  const handleFinalize = () => {
    if (!selectedBag || !selectedWo) return;
    finalizeBag(selectedBag, selectedWo);
  };

  // Excel / CSV Export matching export_plan_excel in main.py
  const handleExportExcel = () => {
    if (!selectedBag || bagRolls.length === 0) return;

    const headers = [
      'Job/WO',
      'Needles',
      'Shade',
      '1st Barcode (Entry)',
      '2nd Barcode (Quality)',
      'Produced Weight (KG)',
      'Quality Weight (KG)'
    ];

    const rowsData = bagRolls.map(r => {
      const qc = qualityChecks.find(q => q.roll_id === r.roll_barcode);
      const bag = bags.find(b => b.bag_number === r.bag_number);
      return [
        r.work_order,
        r.needles,
        bag?.shade || '',
        r.roll_barcode,
        qc ? qc.roll_id : 'Pending',
        r.weight.toFixed(2),
        qc ? qc.grade_a_weight.toFixed(2) : '0.00'
      ];
    });

    const csvContent = [headers.join(','), ...rowsData.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Plan_Status_${selectedBag}_${new Date().toISOString().split('T')[0]}.csv`);
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
            <CheckSquare className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Plan Status & Bag Finalization</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review quality check status of all rolls in a bag. When 100% of rolls are inspected, finalize bag for warehouse & dispatch.
          </p>
        </div>

        {selectedBag && (
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 self-start shadow-sm transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Export Plan Status (Excel/CSV)
          </button>
        )}
      </div>

      {/* Selectors */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Work Order</label>
            <select
              value={selectedWo}
              onChange={e => {
                setSelectedWo(e.target.value);
                setSelectedBag('');
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="">-- Choose Work Order --</option>
              {workOrders.map(w => (
                <option key={w.id} value={w.work_order}>
                  {w.work_order}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Bag</label>
            <select
              value={selectedBag}
              onChange={e => setSelectedBag(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="">-- Choose Bag Number --</option>
              {allAvailableBags.map((b, idx) => (
                <option key={idx} value={b.bag_number}>
                  {b.bag_number} ({b.shade})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status banner when bag is picked */}
        {selectedBag && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                bagStatus === 'Dispatched'
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : isAlreadyFinalized
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                Status: {bagStatus}
              </span>

              <div className="text-xs text-slate-600 font-mono">
                <span>Produced: <strong>{totalPw.toFixed(2)} KG</strong></span>
                <span className="mx-2 text-slate-300">|</span>
                <span className="text-emerald-700">Q-Weight: <strong>{totalQw.toFixed(2)} KG</strong></span>
              </div>
            </div>

            {/* Finalization Action Button */}
            {isAlreadyFinalized ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Bag Finalized &amp; Ready for Dispatch ({finalizedRecord?.total_rolls || bagRolls.length} Rolls)
                </span>
                {(onGoToDispatch || setActiveTab) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onGoToDispatch) onGoToDispatch();
                      else if (setActiveTab) setActiveTab('dispatch');
                    }}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Go to Dispatch</span>
                  </button>
                )}
              </div>
            ) : readyToFinalize ? (
              <button
                onClick={handleFinalize}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer border border-emerald-800"
              >
                <CheckCircle2 className="w-4 h-4" />
                Finalize Bag ({bagRolls.length} Rolls)
              </button>
            ) : (
              <span className="text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {bagRolls.filter(r => qualityChecks.some(qc => qc.roll_id.trim().toLowerCase() === r.roll_barcode.trim().toLowerCase())).length} of {bagRolls.length} rolls passed QC.
                </span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bag Rolls Table */}
      {selectedBag && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="font-bold text-sm text-slate-900">
              Roll Inspection Status for Bag {selectedBag}
            </h2>
            <span className="text-xs font-mono text-slate-500">
              {bagRolls.length} total rolls
            </span>
          </div>

          <div className="overflow-x-auto">
            {bagRolls.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No rolls entered for this bag yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Roll #</th>
                    <th className="py-2.5 px-3">1st Barcode (Entry)</th>
                    <th className="py-2.5 px-3">2nd Barcode (Quality)</th>
                    <th className="py-2.5 px-3">Needles</th>
                    <th className="py-2.5 px-3">Produced Wt (PW)</th>
                    <th className="py-2.5 px-3">Quality Wt (QW)</th>
                    <th className="py-2.5 px-3">QC Status</th>
                    <th className="py-2.5 px-3">Store Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bagRolls.map(r => {
                    const qc = qualityChecks.find(q => q.roll_id === r.roll_barcode);
                    const isQcDone = !!qc;

                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold font-mono text-slate-900">
                          #{r.roll_no}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {r.roll_barcode}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {isQcDone ? (
                            <span className="text-emerald-700 font-bold">{qc.roll_id}</span>
                          ) : (
                            <span className="text-slate-400 italic">Pending</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {r.needles}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {r.weight.toFixed(2)} KG
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {isQcDone ? (
                            <span className="font-bold text-emerald-700">
                              {qc.grade_a_weight.toFixed(2)} KG
                            </span>
                          ) : (
                            <span className="text-slate-400">0.00</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {isQcDone ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Passed
                            </span>
                          ) : (
                            <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-bold border border-amber-200">
                              Awaiting QC
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          {qc?.in_store === 1 ? (
                            <span className="text-emerald-700 font-bold">In Store</span>
                          ) : qc?.in_store === 2 ? (
                            <span className="text-amber-800 font-bold">Dispatched</span>
                          ) : (
                            <span className="text-slate-400">At Knitting</span>
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
      )}
    </div>
  );
};
