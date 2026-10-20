import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GatePassPrintModal } from '../common/GatePassPrintModal';
import { BagReceiptModal } from '../common/BagReceiptModal';
import {
  Truck, Printer, FileText, CheckCircle2, AlertTriangle,
  History, Calendar, User, Hash, ShieldCheck, ArrowRight
} from 'lucide-react';
import { DispatchRecord } from '../../types';

export const DispatchView: React.FC = () => {
  const {
    finalizedBags, dispatchRecords, rolls, qualityChecks, bags,
    dispatchBag
  } = useApp();

  // Form inputs
  const [selectedBagNo, setSelectedBagNo] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('Al-Rahim Garments & Textiles');
  const [vehicleNo, setVehicleNo] = useState<string>('LES-4819');
  const [driverName, setDriverName] = useState<string>('Kashif Raza');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active print modal
  const [activeGatePass, setActiveGatePass] = useState<DispatchRecord | null>(null);
  const [activeReceiptBag, setActiveReceiptBag] = useState<string | null>(null);

  // Available bags: in finalizedBags, not in dispatchRecords
  const availableBags = finalizedBags.filter(
    fb => !dispatchRecords.some(dr => dr.bag_number === fb.bag_number)
  );

  // Picked bag metadata
  const pickedBagObj = finalizedBags.find(fb => fb.bag_number === selectedBagNo);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedBagNo) {
      setErrorMsg('Please select a finalized bag to dispatch.');
      return;
    }

    const res = dispatchBag(selectedBagNo, customerName.trim(), vehicleNo.trim().toUpperCase(), driverName.trim());
    if (!res.success) {
      setErrorMsg(res.message);
    } else {
      // Find the newly created dispatch record
      const newRec = dispatchRecords.find(d => d.bag_number === selectedBagNo);
      if (newRec) {
        setActiveGatePass(newRec);
      }
      setSelectedBagNo('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Dispatch Management & Gate Pass Generation</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch finalized bags, assign transport carrier, issue official Outward Gate Passes, and track dispatch history.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dispatch Form (dispatch.html) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h2 className="font-bold text-sm text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-600" />
            Dispatch Finalized Bag
          </h2>

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Bag Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Finalized Bag *
              </label>
              <select
                required
                value={selectedBagNo}
                onChange={e => setSelectedBagNo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="">-- Choose Bag For Dispatch --</option>
                {availableBags.map(b => (
                  <option key={b.id} value={b.bag_number}>
                    {b.bag_number} ({b.total_rolls} rolls &bull; {b.total_weight.toFixed(1)} KG)
                  </option>
                ))}
              </select>
              {availableBags.length === 0 && (
                <span className="text-[11px] text-amber-700 mt-1 block">
                  No finalized bags ready for dispatch. Finalize a bag under "Plan Status" first.
                </span>
              )}
            </div>

            {/* Bag Verification Info Card */}
            {pickedBagObj && (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-950 font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-emerald-700 font-sans font-medium">Work Order:</span>
                  <span className="font-bold">{pickedBagObj.work_order}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700 font-sans font-medium">Total Rolls:</span>
                  <span className="font-bold">{pickedBagObj.total_rolls} Rolls</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700 font-sans font-medium">Net Dispatched Weight:</span>
                  <span className="font-bold text-sm">{pickedBagObj.total_weight.toFixed(2)} KG</span>
                </div>
              </div>
            )}

            {/* Customer Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Consignee / Customer Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Sapphire Finishing Mills"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Vehicle Number & Driver */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle No *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LES-4819"
                  value={vehicleNo}
                  onChange={e => setVehicleNo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Driver Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kashif Raza"
                  value={driverName}
                  onChange={e => setDriverName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={availableBags.length === 0}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-colors mt-2"
            >
              <Truck className="w-4 h-4 text-emerald-400" />
              Confirm Dispatch & Issue Gate Pass
            </button>
          </form>
        </div>

        {/* Dispatch History Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <div className="pb-3 mb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                Dispatch & Delivery Records
              </h2>
              <p className="text-xs text-slate-500">Historical gate pass logs for out-of-factory shipments</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700">
              {dispatchRecords.length} Shipments
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            {dispatchRecords.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No dispatch records logged yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Gate Pass #</th>
                    <th className="py-2.5 px-3">Bag #</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Vehicle</th>
                    <th className="py-2.5 px-3">Rolls & Wt</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dispatchRecords.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {d.gate_pass_no}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">
                        {d.bag_number}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 truncate max-w-xs">
                        {d.customer_name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {d.vehicle_no}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {d.total_rolls} R ({d.total_weight.toFixed(1)} KG)
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] font-mono">
                        {d.dispatched_at}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveGatePass(d)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                            title="Print Official Gate Pass"
                          >
                            <Printer className="w-3 h-3 text-slate-600" />
                            Gate Pass
                          </button>
                          <button
                            onClick={() => setActiveReceiptBag(d.bag_number)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                            title="Print Bag Receipt"
                          >
                            <FileText className="w-3 h-3 text-emerald-600" />
                            Receipt
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
      </div>

      {/* Official Gate Pass Print Modal */}
      {activeGatePass && (
        <GatePassPrintModal
          dispatch={activeGatePass}
          rolls={rolls}
          qualityChecks={qualityChecks}
          bags={bags}
          onClose={() => setActiveGatePass(null)}
        />
      )}

      {/* Bag Receipt Modal */}
      {activeReceiptBag && (
        <BagReceiptModal
          bagNumber={activeReceiptBag}
          bags={bags}
          rolls={rolls}
          qualityChecks={qualityChecks}
          onClose={() => setActiveReceiptBag(null)}
        />
      )}
    </div>
  );
};
