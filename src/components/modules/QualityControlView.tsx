import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RollSticker } from '../../types';
import { ThermalStickerModal } from '../common/ThermalStickerModal';
import {
  CheckSquare, Search, QrCode, AlertTriangle, Printer,
  ShieldCheck, RefreshCw, Scale, CheckCircle2, History
} from 'lucide-react';

export const QualityControlView: React.FC = () => {
  const { rolls, qualityChecks, inspectQuality } = useApp();

  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [quarryMode, setQuarryMode] = useState<boolean>(false);
  const [sameWeight, setSameWeight] = useState<boolean>(true);
  const [manualWeight, setManualWeight] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastSticker, setLastSticker] = useState<RollSticker | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Quick lookup of the scanned roll when typing barcode
  const activeRoll = rolls.find(r => r.roll_barcode === barcodeInput.trim());
  const existingQc = activeRoll ? qualityChecks.find(q => q.roll_id === activeRoll.roll_barcode) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!barcodeInput.trim()) {
      setErrorMsg('Roll Barcode is required.');
      return;
    }

    const res = inspectQuality(
      barcodeInput.trim(),
      sameWeight,
      parseFloat(manualWeight) || 0,
      quarryMode
    );

    if (!res.success) {
      setErrorMsg(res.message);
    } else if (res.sticker) {
      setLastSticker(res.sticker);
      if (!quarryMode) {
        setShowModal(true);
      }
      setBarcodeInput('');
      setManualWeight('');
      setSameWeight(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Quality Control (QC Inspection & Quarry Mode)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Scan fabric rolls, inspect Grade-A vs Grade-B fabric, and automatically restore balance to PPC Lot if defective fabric is downgraded.
          </p>
        </div>

        {/* Mode Selector Pill */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 self-start text-xs font-semibold">
          <button
            type="button"
            onClick={() => setQuarryMode(false)}
            className={`px-3 py-1.5 rounded-md transition-all ${
              !quarryMode ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inspection Mode
          </button>
          <button
            type="button"
            onClick={() => setQuarryMode(true)}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              quarryMode ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Quarry (Search) Mode
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inspection Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h2 className="font-bold text-sm text-slate-900 mb-3 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>{quarryMode ? 'Search Roll Record' : 'Scan Roll for QC Inspection'}</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
              quarryMode ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {quarryMode ? 'Quarry Mode' : 'QC Mode'}
            </span>
          </h2>

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scan Roll Barcode (7-Digit) *
              </label>
              <div className="relative">
                <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 7192843"
                  value={barcodeInput}
                  onChange={e => {
                    setBarcodeInput(e.target.value);
                    setErrorMsg(null);
                  }}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold tracking-wider uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Live Detected Info */}
            {activeRoll && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Roll No:</span>
                  <span className="font-bold font-mono">#{activeRoll.roll_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Produced Weight (PW):</span>
                  <span className="font-bold font-mono text-slate-900">{activeRoll.weight.toFixed(2)} KG</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bag & Lot:</span>
                  <span className="font-mono">{activeRoll.bag_number} / {activeRoll.lot_name}</span>
                </div>
                {existingQc && (
                  <div className="pt-1 mt-1 border-t border-slate-200 flex justify-between text-emerald-700 font-semibold">
                    <span>Already Inspected:</span>
                    <span>QW: {existingQc.grade_a_weight.toFixed(2)} KG</span>
                  </div>
                )}
              </div>
            )}

            {/* Weight inputs (Inspection Mode only) */}
            {!quarryMode && (
              <div className="space-y-3 pt-1 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sameWeight}
                    onChange={e => setSameWeight(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Same Weight (PW = QW: 100% Grade-A)
                  </span>
                </label>

                {!sameWeight && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Manual Grade-A Weight (KG) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required={!sameWeight}
                      placeholder={activeRoll ? activeRoll.weight.toString() : '21.50'}
                      value={manualWeight}
                      onChange={e => setManualWeight(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-amber-700 mt-1 block">
                      Difference (PW - QW) will be marked as B-Grade and restored to Lot balance.
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-2.5 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-colors ${
                quarryMode ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {quarryMode ? <Search className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              {quarryMode ? 'Search Roll Record' : 'Record Quality Check'}
            </button>
          </form>
        </div>

        {/* Quality Check Inspection History & Live QC Sticker */}
        <div className="lg:col-span-2 space-y-5">
          {/* Recent QC Verified Rolls */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              Recent Quality Inspected Rolls
            </h2>

            <div className="overflow-x-auto">
              {qualityChecks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No quality checks recorded yet.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Roll Barcode</th>
                      <th className="py-2 px-3">Orig Weight (PW)</th>
                      <th className="py-2 px-3">Grade-A Weight</th>
                      <th className="py-2 px-3">Grade-B Defect</th>
                      <th className="py-2 px-3">Store Status</th>
                      <th className="py-2 px-3">Checked At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {qualityChecks.slice(-6).reverse().map(qc => (
                      <tr key={qc.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {qc.roll_id}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {qc.original_weight.toFixed(2)} KG
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                          {qc.grade_a_weight.toFixed(2)} KG
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {qc.grade_b_weight > 0 ? (
                            <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              +{qc.grade_b_weight.toFixed(2)} KG Restored
                            </span>
                          ) : (
                            <span className="text-slate-400">0.00 KG</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          {qc.in_store === 1 ? (
                            <span className="text-emerald-700 font-bold">In Store</span>
                          ) : qc.in_store === 2 ? (
                            <span className="text-amber-800 font-bold">Dispatched</span>
                          ) : (
                            <span className="text-slate-500">Pending Store</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                          {qc.checked_at}
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

      {/* QC Sticker Modal */}
      {showModal && lastSticker && (
        <ThermalStickerModal sticker={lastSticker} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
};
