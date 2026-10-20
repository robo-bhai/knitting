import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Warehouse, Scan, CheckSquare, Layers, ShieldCheck,
  CheckCircle2, AlertCircle, ArrowRight
} from 'lucide-react';

export const FabricStoreView: React.FC = () => {
  const { bags, rolls, qualityChecks, saveStoreStock } = useApp();

  const [bagInput, setBagInput] = useState<string>('BAG-8801-01');
  const [scannedBag, setScannedBag] = useState<string | null>(null);
  const [pendingRolls, setPendingRolls] = useState<any[]>([]);
  const [selectedBarcodes, setSelectedBarcodes] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  // Scan Bag handler (mirrors /fabric-store/scan-bag)
  const handleScanBag = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const bagNo = bagInput.trim().toUpperCase();
    if (!bagNo) return;

    // Filter rolls: quality checked (in qualityChecks) AND in_store === 0
    const matchingRolls = rolls.filter(r => {
      if (r.bag_number !== bagNo) return false;
      const qc = qualityChecks.find(q => q.roll_id === r.roll_barcode);
      return qc && qc.in_store === 0;
    }).map(r => {
      const qc = qualityChecks.find(q => q.roll_id === r.roll_barcode)!;
      const bag = bags.find(b => b.bag_number === r.bag_number);
      return {
        roll_no: r.roll_no,
        roll_barcode: r.roll_barcode,
        needles: r.needles,
        shade: bag?.shade || '',
        qw: qc.grade_a_weight,
        machine_no: r.machine_no
      };
    });

    setScannedBag(bagNo);
    setPendingRolls(matchingRolls);
    setSelectedBarcodes(matchingRolls.map(r => r.roll_barcode)); // auto select all by default

    if (matchingRolls.length === 0) {
      setMessage(`No pending quality-cleared rolls found for bag ${bagNo}. (They may already be in store or pending QC)`);
    }
  };

  const toggleBarcode = (barcode: string) => {
    setSelectedBarcodes(prev =>
      prev.includes(barcode) ? prev.filter(b => b !== barcode) : [...prev, barcode]
    );
  };

  const handleSelectAll = (check: boolean) => {
    if (check) {
      setSelectedBarcodes(pendingRolls.map(r => r.roll_barcode));
    } else {
      setSelectedBarcodes([]);
    }
  };

  const handleSaveStock = () => {
    if (selectedBarcodes.length === 0) return;
    const res = saveStoreStock(selectedBarcodes);
    if (res.success) {
      // Remove cleared rolls from pending list
      setPendingRolls(prev => prev.filter(r => !selectedBarcodes.includes(r.roll_barcode)));
      setSelectedBarcodes([]);
      setMessage(`Successfully stocked ${selectedBarcodes.length} roll(s) into Fabric Warehouse inventory!`);
    }
  };

  // Stock inventory metrics
  const rollsInStore = qualityChecks.filter(q => q.in_store === 1);
  const totalStoreWeight = rollsInStore.reduce((sum, q) => sum + q.grade_a_weight, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Fabric Store Inventory Intake</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Scan bag numbers, verify Grade-A quality cleared rolls, and check them into warehouse stock inventory.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-right">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Warehouse Stocked Balance</span>
          <span className="text-base font-bold font-mono text-slate-900">
            {rollsInStore.length} Rolls ({totalStoreWeight.toFixed(2)} KG)
          </span>
        </div>
      </div>

      {/* Bag Scanner Input */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <form onSubmit={handleScanBag} className="flex flex-col sm:flex-row items-end gap-3 max-w-xl">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Enter / Scan Bag Number
            </label>
            <div className="relative">
              <Scan className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="e.g. BAG-8801-01"
                value={bagInput}
                onChange={e => setBagInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Scan className="w-4 h-4 text-emerald-400" />
            Fetch Bag Rolls
          </button>
        </form>

        {message && (
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </div>

      {/* Scanned Bag Pending Rolls List */}
      {scannedBag && pendingRolls.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-sm text-slate-900">
                QC-Cleared Rolls for Bag: <span className="font-mono text-emerald-700">{scannedBag}</span>
              </h2>
              <span className="text-xs text-slate-500">
                Select rolls to confirm receipt into store stock
              </span>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedBarcodes.length === pendingRolls.length && pendingRolls.length > 0}
                  onChange={e => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span>Select All ({pendingRolls.length})</span>
              </label>

              <button
                onClick={handleSaveStock}
                disabled={selectedBarcodes.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <CheckSquare className="w-4 h-4" />
                Save Stock ({selectedBarcodes.length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 w-12 text-center">Select</th>
                  <th className="py-2.5 px-4">Roll #</th>
                  <th className="py-2.5 px-4">Roll Barcode</th>
                  <th className="py-2.5 px-4">Needles</th>
                  <th className="py-2.5 px-4">Shade</th>
                  <th className="py-2.5 px-4">Machine</th>
                  <th className="py-2.5 px-4 text-right">A-Grade Weight (QW)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingRolls.map(r => {
                  const isChecked = selectedBarcodes.includes(r.roll_barcode);
                  return (
                    <tr
                      key={r.roll_barcode}
                      onClick={() => toggleBarcode(r.roll_barcode)}
                      className={`cursor-pointer transition-colors ${
                        isChecked ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleBarcode(r.roll_barcode)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                      </td>
                      <td className="py-2.5 px-4 font-bold font-mono text-slate-900">
                        #{r.roll_no}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                        {r.roll_barcode}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        {r.needles}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">
                        {r.shade}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-800">
                        {r.machine_no}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-800">
                        {r.qw.toFixed(2)} KG
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
