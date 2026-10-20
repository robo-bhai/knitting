import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RollSticker } from '../../types';
import { ThermalStickerModal } from '../common/ThermalStickerModal';
import {
  ScrollText, QrCode, Weight, CheckCircle2, AlertTriangle,
  Printer, ArrowRight, Layers, Tag, Cpu, RefreshCw
} from 'lucide-react';

export const RollEntryView: React.FC = () => {
  const {
    workOrders, plans, bags, finalizedBags,
    getLotsForBag, saveRoll, machineAssignments
  } = useApp();

  // Cascading Selection
  const [selectedWo, setSelectedWo] = useState<string>(workOrders[0]?.work_order || '');
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [selectedBag, setSelectedBag] = useState<string>('');
  const [selectedLot, setSelectedLot] = useState<string>('');

  // Form Fields
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [weightInput, setWeightInput] = useState<string>('22.5');
  const [tubeInput, setTubeInput] = useState<string>('T-105');
  const [needlesInput, setNeedlesInput] = useState<string>('24N');

  // Generated Sticker Modal
  const [activeSticker, setActiveSticker] = useState<RollSticker | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Available Plans for WO
  const woObj = workOrders.find(w => w.work_order === selectedWo);
  const availablePlans = woObj ? plans.filter(p => p.work_order_id === woObj.id) : [];

  // Available Bags for Plan (exclude finalized bags as in main.py)
  const planObj = plans.find(p => p.plan_id === selectedPlan);
  const availableBags = planObj
    ? bags.filter(b => b.plan_id === planObj.id && !finalizedBags.some(fb => fb.bag_number === b.bag_number))
    : [];

  // Available Lots for Bag
  const availableLots = selectedBag ? getLotsForBag(selectedBag) : [];

  // When WO changes
  const handleWoChange = (wo: string) => {
    setSelectedWo(wo);
    setSelectedPlan('');
    setSelectedBag('');
    setSelectedLot('');
    setErrorMsg(null);
  };

  // When Plan changes
  const handlePlanChange = (planId: string) => {
    setSelectedPlan(planId);
    setSelectedBag('');
    setSelectedLot('');
    setErrorMsg(null);
  };

  // When Bag changes
  const handleBagChange = (bagNo: string) => {
    setSelectedBag(bagNo);
    setSelectedLot('');
    setErrorMsg(null);
  };

  // When Lot is picked
  const handleLotSelect = (lot: any) => {
    setSelectedLot(lot.lot_name);
    setNeedlesInput(lot.needles);
    if (lot.barcode) {
      setBarcodeInput(lot.barcode);
    }
    setErrorMsg(null);
  };

  const handleBarcodeChange = (val: string) => {
    setBarcodeInput(val);
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedWo || !selectedPlan || !selectedBag || !selectedLot) {
      setErrorMsg('Please select Work Order, Plan, Bag, and Lot first.');
      return;
    }

    if (!barcodeInput.trim()) {
      setErrorMsg('Machine Barcode is required. Sign in machine if needed.');
      return;
    }

    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight <= 0) {
      setErrorMsg('Please enter a valid weight.');
      return;
    }

    const res = saveRoll({
      work_order: selectedWo,
      plan_id: selectedPlan,
      bag_number: selectedBag,
      lot_name: selectedLot,
      needles: needlesInput,
      weight,
      tube_no: tubeInput,
      barcode: barcodeInput.trim()
    });

    if (!res.success) {
      setErrorMsg(res.message || 'Error saving roll');
    } else if (res.sticker) {
      setActiveSticker(res.sticker);
      // Increment tube number for convenient fast sequential feeding
      const tubeNum = parseInt(tubeInput.replace(/\D/g, ''), 10);
      if (!isNaN(tubeNum)) {
        setTubeInput(`T-${tubeNum + 1}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Roll Entry & Barcode System</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Feed knitting rolls, validate against signed machine code, auto-deduct Lot weight balance, and generate 7-digit thermal sticker.
          </p>
        </div>

        {/* Quick hint of signed machines */}
        <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-slate-600">
            Active Machine Barcodes: <strong>{machineAssignments.map(m => m.unique_code).join(', ') || 'None'}</strong>
          </span>
        </div>
      </div>

      {/* Cascading Navigation: Step 1 -> 2 -> 3 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          Step 1: Select Work Order, Plan & Bag
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* WO */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">1. Work Order</label>
            <select
              value={selectedWo}
              onChange={e => handleWoChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="">-- Select Work Order --</option>
              {workOrders.map(w => (
                <option key={w.id} value={w.work_order}>
                  {w.work_order}
                </option>
              ))}
            </select>
          </div>

          {/* Plan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">2. Production Plan</label>
            <select
              value={selectedPlan}
              disabled={!selectedWo}
              onChange={e => handlePlanChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="">-- Select Plan --</option>
              {availablePlans.map(p => (
                <option key={p.id} value={p.plan_id}>
                  {p.plan_id}
                </option>
              ))}
            </select>
          </div>

          {/* Bag */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">3. Bag (Shade)</label>
            <select
              value={selectedBag}
              disabled={!selectedPlan}
              onChange={e => handleBagChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="">-- Select Bag --</option>
              {availableBags.map(b => (
                <option key={b.id} value={b.bag_number}>
                  {b.bag_number} ({b.shade})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lots Selection Grid for the picked Bag */}
        {selectedBag && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
              Available Lots in {selectedBag}:
            </span>

            {availableLots.length === 0 ? (
              <p className="text-xs text-slate-400">No lots configured for this bag.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {availableLots.map((lot, idx) => {
                  const isSelected = selectedLot === lot.lot_name;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleLotSelect(lot)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/60 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-xs font-mono text-slate-900">{lot.lot_name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                          {lot.needles}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-600 font-mono mt-2">
                        <span>Balance: <strong className="text-emerald-700">{lot.rem_weight.toFixed(1)} KG</strong></span>
                        <span>{lot.roll_count} rolls fed</span>
                      </div>
                      {lot.machine_no && (
                        <div className="text-[10px] text-slate-500 mt-1 font-mono">
                          Linked Machine: {lot.machine_no} ({lot.barcode})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Roll Feeding Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Tag className="w-4 h-4 text-emerald-600" />
          Step 2: Scan Machine Barcode & Record Weight
        </h2>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Validation Error:</span> {errorMsg}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Machine Barcode Scanner/Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scan Machine Barcode (5-Digit) *
              </label>
              <div className="relative">
                <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 54219"
                  value={barcodeInput}
                  onChange={e => handleBarcodeChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold tracking-wider uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Validated against Job ID & Needle mapping.
              </span>
            </div>

            {/* Needles Spec */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lot Needles *</label>
              <input
                type="text"
                required
                value={needlesInput}
                onChange={e => setNeedlesInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Produced Weight (PW) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Roll Weight (KG) *</label>
              <div className="relative">
                <Weight className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="22.50"
                  value={weightInput}
                  onChange={e => setWeightInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Tube Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tube Number</label>
              <input
                type="text"
                placeholder="e.g. T-105"
                value={tubeInput}
                onChange={e => setTubeInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono">
              Target Lot: <strong className="text-slate-900">{selectedLot || 'None selected'}</strong> | Bag:{' '}
              <strong className="text-slate-900">{selectedBag || 'None'}</strong>
            </span>

            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              Save Roll & Print Thermal Label
            </button>
          </div>
        </form>
      </div>

      {/* Thermal Label Modal */}
      <ThermalStickerModal sticker={activeSticker} onClose={() => setActiveSticker(null)} />
    </div>
  );
};
