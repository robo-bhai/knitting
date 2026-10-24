import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { RollSticker, FabricRoll } from '../../types';
import { ThermalStickerModal } from '../common/ThermalStickerModal';
import {
  ScrollText, Printer, Layers, Tag, Cpu, RefreshCw, Copy, Check,
  AlertTriangle, CheckCircle2, XCircle, ArrowRight, FileText,
  Filter, Info, ShieldCheck, ChevronRight
} from 'lucide-react';

export const RollEntryView: React.FC = () => {
  const {
    workOrders, plans, bags, lots, finalizedBags,
    getLotsForBag, saveRoll, machineAssignments, rolls
  } = useApp();

  // Filter mode: Complete Series Only (default requested) or All Work Orders
  const [completeSeriesOnly, setCompleteSeriesOnly] = useState<boolean>(true);

  // Cascading Selection State
  const [woInput, setWoInput] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [selectedBag, setSelectedBag] = useState<string>('');
  const [selectedLot, setSelectedLot] = useState<string>('');

  // Form Input State
  const [rollNoInput, setRollNoInput] = useState<string>('1');
  const [weightInput, setWeightInput] = useState<string>('22.50');
  const [tubeInput, setTubeInput] = useState<string>('T-101');
  const [machineBarcodeInput, setMachineBarcodeInput] = useState<string>('');
  const [isMergedDetected, setIsMergedDetected] = useState<boolean>(false);

  // Copy Feedback
  const [copiedStrip, setCopiedStrip] = useState<boolean>(false);

  // Generated Sticker Modal & Mismatch Modal
  const [activeSticker, setActiveSticker] = useState<RollSticker | null>(null);
  const [mismatchError, setMismatchError] = useState<{
    title: string;
    message: string;
    machineSpec?: any;
    lotSpec?: any;
  } | null>(null);

  // References to auto-focus elements
  const planSelectRef = useRef<HTMLSelectElement>(null);
  const bagSelectRef = useRef<HTMLSelectElement>(null);
  const lotSelectRef = useRef<HTMLSelectElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);

  // 1. Identify Work Orders with Complete Series: WO > Plan > Bag > Lot > Machine Sign
  const completeSeriesWos = useMemo(() => {
    return workOrders.filter(wo => {
      // Find plans for this WO
      const woPlans = plans.filter(p => p.work_order_id === wo.id || String(p.work_order_id) === String(wo.id));
      if (woPlans.length === 0) return false;

      // Find bags for these plans
      const woPlanIds = woPlans.map(p => p.id);
      const woBags = bags.filter(b => woPlanIds.includes(b.plan_id));
      if (woBags.length === 0) return false;

      // Find lots for these bags
      const woBagIds = woBags.map(b => b.id);
      const woLots = lots.filter(l => woBagIds.includes(l.bag_id));
      if (woLots.length === 0) return false;

      // Check if machine signed for this WO
      const hasMachine = machineAssignments.some(m => {
        const text = m.job_full_text || '';
        return text.toLowerCase().includes(wo.work_order.toLowerCase()) ||
               (m.unique_code && m.unique_code.length === 5);
      });

      return hasMachine;
    });
  }, [workOrders, plans, bags, lots, machineAssignments]);

  const displayedWorkOrders = useMemo(() => {
    if (completeSeriesOnly && completeSeriesWos.length > 0) {
      return completeSeriesWos;
    }
    return workOrders;
  }, [completeSeriesOnly, completeSeriesWos, workOrders]);

  // Set default WO on load if not set
  useEffect(() => {
    if (!woInput && displayedWorkOrders.length > 0) {
      const defaultWo = displayedWorkOrders[0].work_order;
      setWoInput(defaultWo);
      triggerWoCascade(defaultWo);
    }
  }, [displayedWorkOrders]);

  // Robust matching for Plans belonging to the selected Work Order
  const availablePlans = useMemo(() => {
    if (!woInput.trim()) return [];
    const cleanWo = woInput.trim().toLowerCase().split('/').pop()?.trim() || woInput.trim().toLowerCase();

    // Match work order by name or ID
    const woObj = workOrders.find(w =>
      w.work_order.toLowerCase().trim() === cleanWo ||
      w.work_order.toLowerCase().trim() === woInput.trim().toLowerCase() ||
      String(w.id) === cleanWo
    );

    return plans.filter(p => {
      if (woObj && p.work_order_id === woObj.id) return true;
      if (String(p.work_order_id) === String(woObj?.id)) return true;
      if (String(p.work_order_id).toLowerCase() === cleanWo) return true;
      if ((p as any).work_order && (p as any).work_order.toLowerCase().trim() === cleanWo) return true;
      if (p.plan_id.toLowerCase().includes(cleanWo.replace(/[^a-z0-9]/g, ''))) return true;
      return false;
    });
  }, [woInput, workOrders, plans]);

  // Available Bags for the selected Plan
  const availableBags = useMemo(() => {
    if (!selectedPlan) return [];
    const planObj = plans.find(p => p.plan_id.toLowerCase().trim() === selectedPlan.toLowerCase().trim());
    return bags.filter(b => {
      const matchesPlan = planObj ? (b.plan_id === planObj.id || String(b.plan_id) === String(planObj.id)) : false;
      const notFinalized = !finalizedBags.some(fb => fb.bag_number === b.bag_number && fb.status === 'Dispatched');
      return matchesPlan && notFinalized;
    });
  }, [selectedPlan, plans, bags, finalizedBags]);

  // Available Lots for the selected Bag
  const availableLots = useMemo(() => {
    if (!selectedBag) return [];
    return getLotsForBag(selectedBag);
  }, [selectedBag, getLotsForBag]);

  // Selected Bag & Lot Objects
  const currentBagObj = bags.find(b => b.bag_number.toLowerCase().trim() === selectedBag.toLowerCase().trim());
  const currentLotObj = availableLots.find(l => l.lot_name.toLowerCase().trim() === selectedLot.toLowerCase().trim());

  // Feeded Rolls for the selected Lot
  const lotFeededRolls = useMemo(() => {
    if (!woInput || !selectedBag || !selectedLot) return [];
    return rolls.filter(r =>
      r.work_order.toLowerCase().trim() === woInput.toLowerCase().trim() &&
      r.bag_number.toLowerCase().trim() === selectedBag.toLowerCase().trim() &&
      r.lot_name.toLowerCase().trim() === selectedLot.toLowerCase().trim()
    );
  }, [rolls, woInput, selectedBag, selectedLot]);

  // Latest Roll info in this lot (for 1-line dark summary strip)
  const latestRoll = lotFeededRolls.length > 0 ? lotFeededRolls[lotFeededRolls.length - 1] : null;

  // Auto sequential next roll number
  const calculatedNextRollNo = useMemo(() => {
    if (lotFeededRolls.length === 0) return 1;
    const maxNo = lotFeededRolls.reduce((max, r) => Math.max(max, r.roll_no), 0);
    return maxNo + 1;
  }, [lotFeededRolls]);

  // Sync roll number input when next roll number changes
  useEffect(() => {
    setRollNoInput(String(calculatedNextRollNo));
  }, [calculatedNextRollNo]);

  // Check if current roll number already exists (Merge detection)
  useEffect(() => {
    const num = parseInt(rollNoInput, 10);
    if (!isNaN(num) && num > 0) {
      const exists = lotFeededRolls.some(r => r.roll_no === num);
      setIsMergedDetected(exists);
    } else {
      setIsMergedDetected(false);
    }
  }, [rollNoInput, lotFeededRolls]);

  // Trigger Full Cascade when Work Order changes (via Enter or select or blur)
  const triggerWoCascade = (woValue: string) => {
    const trimmed = woValue.trim();
    if (!trimmed) return;
    setWoInput(trimmed);

    const cleanWo = trimmed.toLowerCase().split('/').pop()?.trim() || trimmed.toLowerCase();
    const woObj = workOrders.find(w =>
      w.work_order.toLowerCase().trim() === cleanWo ||
      w.work_order.toLowerCase().trim() === trimmed.toLowerCase() ||
      String(w.id) === cleanWo
    );

    const pList = plans.filter(p => {
      if (woObj && p.work_order_id === woObj.id) return true;
      if (String(p.work_order_id) === String(woObj?.id)) return true;
      if (String(p.work_order_id).toLowerCase() === cleanWo) return true;
      if ((p as any).work_order && (p as any).work_order.toLowerCase().trim() === cleanWo) return true;
      if (p.plan_id.toLowerCase().includes(cleanWo.replace(/[^a-z0-9]/g, ''))) return true;
      return false;
    });

    if (pList.length > 0) {
      const firstPlan = pList[0].plan_id;
      setSelectedPlan(firstPlan);

      // Bags for first plan
      const bList = bags.filter(b => (b.plan_id === pList[0].id || String(b.plan_id) === String(pList[0].id)));
      if (bList.length > 0) {
        const firstBag = bList[0].bag_number;
        setSelectedBag(firstBag);

        // Lots for first bag
        const lList = getLotsForBag(firstBag);
        if (lList.length > 0) {
          setSelectedLot(lList[0].lot_name);
        } else {
          setSelectedLot('');
        }
      } else {
        setSelectedBag('');
        setSelectedLot('');
      }
    } else {
      setSelectedPlan('');
      setSelectedBag('');
      setSelectedLot('');
    }
  };

  // When user presses Enter in Work Order box
  const handleWoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerWoCascade(woInput);
      planSelectRef.current?.focus();
    }
  };

  const handleWoBlur = () => {
    triggerWoCascade(woInput);
  };

  // Plan Selection handler
  const handlePlanChange = (planId: string) => {
    setSelectedPlan(planId);
    const planObj = plans.find(p => p.plan_id.toLowerCase().trim() === planId.toLowerCase().trim());
    if (planObj) {
      const bList = bags.filter(b => b.plan_id === planObj.id || String(b.plan_id) === String(planObj.id));
      if (bList.length > 0) {
        const firstBag = bList[0].bag_number;
        setSelectedBag(firstBag);
        const lList = getLotsForBag(firstBag);
        if (lList.length > 0) {
          setSelectedLot(lList[0].lot_name);
        } else {
          setSelectedLot('');
        }
      } else {
        setSelectedBag('');
        setSelectedLot('');
      }
    }
    bagSelectRef.current?.focus();
  };

  // Bag Selection handler
  const handleBagChange = (bagNo: string) => {
    setSelectedBag(bagNo);
    const lList = getLotsForBag(bagNo);
    if (lList.length > 0) {
      setSelectedLot(lList[0].lot_name);
    } else {
      setSelectedLot('');
    }
    lotSelectRef.current?.focus();
  };

  // Lot Selection handler
  const handleLotChange = (lotName: string) => {
    setSelectedLot(lotName);
    weightInputRef.current?.focus();
  };

  // Copy Strip Barcode
  const handleCopyStripBarcode = () => {
    if (latestRoll?.roll_barcode) {
      navigator.clipboard.writeText(latestRoll.roll_barcode);
      setCopiedStrip(true);
      setTimeout(() => setCopiedStrip(false), 2000);
    }
  };

  // Live Machine Barcode Lookup
  const matchedMachine = useMemo(() => {
    if (!machineBarcodeInput.trim() || machineBarcodeInput.trim().length !== 5) return null;
    return machineAssignments.find(m => m.unique_code.trim() === machineBarcodeInput.trim()) || null;
  }, [machineBarcodeInput, machineAssignments]);

  // Form Submit Handler
  const handleFeedRoll = (e: React.FormEvent) => {
    e.preventDefault();
    setMismatchError(null);

    if (!woInput.trim() || !selectedPlan || !selectedBag || !selectedLot) {
      setMismatchError({
        title: 'Missing Required Selection',
        message: 'Please complete all steps in Row 1: Work Order, Plan, Bag, and Lot.'
      });
      return;
    }

    if (!machineBarcodeInput.trim() || machineBarcodeInput.trim().length !== 5) {
      setMismatchError({
        title: '5-Digit Machine Barcode Required',
        message: 'Please enter the 5-digit Machine Barcode generated in Machine Sign (/machine-sign).'
      });
      return;
    }

    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight <= 0) {
      setMismatchError({
        title: 'Invalid Weight',
        message: 'Please enter a valid positive weight in KG (e.g. 22.50).'
      });
      return;
    }

    const targetRollNo = parseInt(rollNoInput, 10);
    const lotNeedles = currentLotObj?.needles || '24N';

    const result = saveRoll({
      work_order: woInput.trim(),
      plan_id: selectedPlan,
      bag_number: selectedBag,
      lot_name: selectedLot,
      needles: lotNeedles,
      weight,
      tube_no: tubeInput.trim() || `T-${targetRollNo || calculatedNextRollNo}`,
      barcode: machineBarcodeInput.trim(),
      target_roll_no: !isNaN(targetRollNo) && targetRollNo > 0 ? targetRollNo : calculatedNextRollNo
    });

    if (!result.success) {
      setMismatchError({
        title: result.mismatch_type === 'needles'
          ? '🚨 Needles Specification Mismatch!'
          : result.mismatch_type === 'work_order'
          ? '🚨 Work Order Mismatch!'
          : '🚨 Specification Mismatch!',
        message: result.message || 'Specifications do not match signed machine.',
        machineSpec: result.machine_spec,
        lotSpec: result.lot_spec
      });
    } else if (result.sticker) {
      setActiveSticker(result.sticker);
      // Auto-increment tube number for convenient operator workflow
      const tubeDigits = parseInt(tubeInput.replace(/\D/g, ''), 10);
      if (!isNaN(tubeDigits)) {
        setTubeInput(`T-${tubeDigits + 1}`);
      }
    }
  };

  // Re-print existing roll sticker from table
  const handleReprintRoll = (roll: FabricRoll) => {
    const sticker: RollSticker = {
      roll_barcode: roll.roll_barcode,
      bag: roll.bag_number,
      lot: roll.lot_name,
      roll_no: roll.roll_no,
      job_wo: `Job-1/${roll.work_order}`,
      needle: roll.needles,
      shade: currentBagObj?.shade || '',
      machine: roll.machine_no,
      weight: roll.weight,
      date: roll.created_at,
      is_merged: roll.is_merged
    };
    setActiveSticker(sticker);
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Top Header Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-emerald-600" />
            <h1 className="text-base sm:text-lg font-bold text-slate-900">
              Fabric Roll Feeding Station (/roll-entry)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cascading Work Order &rarr; Plan &rarr; Bag &rarr; Lot &rarr; 5-Digit Machine Barcode with instant sticker &amp; merge support.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Toggle: Complete Series vs All */}
          <button
            type="button"
            onClick={() => setCompleteSeriesOnly(prev => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
              completeSeriesOnly
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            title="Toggle Complete Series Filter"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{completeSeriesOnly ? 'Complete Series Only' : 'All PPC Work Orders'}</span>
          </button>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Auto-Cascading Active
          </span>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ================= LEFT SECTION: FEED FORM & CONTROLS ================= */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            
            {/* Section Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Roll Feed Form
              </h2>
              <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
                availablePlans.length > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {availablePlans.length > 0 ? `${availablePlans.length} Plan(s) Loaded` : 'Type WO & Press Enter'}
              </span>
            </div>

            <form onSubmit={handleFeedRoll} className="space-y-4">
              
              {/* PEHLI ROW: 4 Cascading Dropdowns/Inputs in One Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                
                {/* 1. Work Order Box (Enter or Select) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold uppercase text-slate-700">
                      1. Work Order <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[9px] text-slate-400 font-mono">Enter &crarr;</span>
                  </div>
                  <input
                    type="text"
                    list="wo_datalist"
                    value={woInput}
                    onChange={e => setWoInput(e.target.value)}
                    onKeyDown={handleWoKeyDown}
                    onBlur={handleWoBlur}
                    placeholder="Type WO & press Enter..."
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <datalist id="wo_datalist">
                    {displayedWorkOrders.map(w => (
                      <option key={w.id} value={w.work_order}>
                        {w.work_order}
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* 2. Plan IDs Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold uppercase text-slate-700">
                      2. Plan ID <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {availablePlans.length} plan(s)
                    </span>
                  </div>
                  <select
                    ref={planSelectRef}
                    value={selectedPlan}
                    disabled={availablePlans.length === 0}
                    onChange={e => handlePlanChange(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="">{availablePlans.length === 0 ? '-- No Plans for WO --' : '-- Choose Plan --'}</option>
                    {availablePlans.map(p => (
                      <option key={p.id} value={p.plan_id}>
                        {p.plan_id}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Bag / Badge Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold uppercase text-slate-700">
                      3. Bag / Badge <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {availableBags.length} bag(s)
                    </span>
                  </div>
                  <select
                    ref={bagSelectRef}
                    value={selectedBag}
                    disabled={availableBags.length === 0}
                    onChange={e => handleBagChange(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="">{availableBags.length === 0 ? '-- No Bags in Plan --' : '-- Choose Bag --'}</option>
                    {availableBags.map(b => (
                      <option key={b.id} value={b.bag_number}>
                        {b.bag_number} ({b.shade})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Lot Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold uppercase text-slate-700">
                      4. Target Lot <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {availableLots.length} lot(s)
                    </span>
                  </div>
                  <select
                    ref={lotSelectRef}
                    value={selectedLot}
                    disabled={availableLots.length === 0}
                    onChange={e => handleLotChange(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="">{availableLots.length === 0 ? '-- No Lots in Bag --' : '-- Choose Lot --'}</option>
                    {availableLots.map(lot => {
                      const lotBal = Number(lot.fabric_weight ?? lot.rem_weight ?? 0);
                      return (
                        <option key={lot.id || lot.lot_name} value={lot.lot_name}>
                          {lot.lot_name} ({lot.needles || '24N'} - Bal: {lotBal.toFixed(1)} KG)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* SUMMARY STRIP IN ONE LINE (Already Feed Barcode, Job/WO, Shade, Machine) */}
              {latestRoll && (
                <div className="p-3 bg-slate-900 text-white rounded-xl text-xs shadow-inner animate-in fade-in duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Already Feed Barcode:</span>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono font-bold rounded border border-emerald-500/30">
                        {latestRoll.roll_barcode}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyStripBarcode}
                        className="px-2 py-0.5 text-[10px] bg-white/10 hover:bg-white/20 text-white rounded transition-colors flex items-center gap-1 cursor-pointer"
                        title="Copy Roll Barcode"
                      >
                        {copiedStrip ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedStrip ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                      <div className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700">
                        <span className="text-slate-400 text-[10px]">Job/WO: </span>
                        <strong className="text-white">{`Job-1/${woInput}`}</strong>
                      </div>
                      <div className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700">
                        <span className="text-slate-400 text-[10px]">Shade: </span>
                        <strong className="text-white">{currentBagObj?.shade || '--'}</strong>
                      </div>
                      <div className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700">
                        <span className="text-slate-400 text-[10px]">Machine: </span>
                        <strong className="text-emerald-400">{latestRoll.machine_no || 'M-01'}</strong>
                      </div>
                      <div className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700">
                        <span className="text-slate-400 text-[10px]">Needles: </span>
                        <strong className="text-white">{currentLotObj?.needles || '24N'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NEXT ROW: Roll Number, Roll Weight, Tube No, Machine Barcode, Submit Button */}
              <div className="pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 items-end">
                  
                  {/* Roll Number Box */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-700">
                        Roll Number
                      </label>
                      <span className="text-[9px] text-emerald-600 font-mono font-semibold">
                        Auto: 1, 2, 3..
                      </span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={rollNoInput}
                      onChange={e => setRollNoInput(e.target.value)}
                      placeholder="Auto (1, 2..)"
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Roll Weight Box */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      Roll Weight (KG) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      ref={weightInputRef}
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="150"
                      required
                      value={weightInput}
                      onChange={e => setWeightInput(e.target.value)}
                      placeholder="e.g. 22.50"
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-emerald-50/20"
                    />
                  </div>

                  {/* Tube Box */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      Tube No
                    </label>
                    <input
                      type="text"
                      value={tubeInput}
                      onChange={e => setTubeInput(e.target.value)}
                      placeholder="T-101"
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Machine Sign Barcode (5-Digit) Box */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-700">
                        Machine Barcode <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[9px] text-slate-400 font-mono">5-Digits</span>
                    </div>
                    <input
                      type="text"
                      maxLength={5}
                      required
                      value={machineBarcodeInput}
                      onChange={e => setMachineBarcodeInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 54219"
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold tracking-widest uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-emerald-50/40 text-emerald-950"
                    />
                  </div>

                  {/* Submit Button ("Feed Roll") */}
                  <div>
                    <button
                      type="submit"
                      className="w-full px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Feed Roll</span>
                    </button>
                  </div>
                </div>

                {/* Merge Notification Notice */}
                {isMergedDetected && (
                  <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-center gap-2 animate-in fade-in duration-150">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Notice:</strong> Roll #{rollNoInput} already exists in this Lot. Submitting will <strong>merge +{weightInput} KG</strong> into the existing roll!
                    </span>
                  </div>
                )}

                {/* Live Machine Barcode Verification Status */}
                {machineBarcodeInput.length === 5 && (
                  <div className={`mt-3 p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                    matchedMachine ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50 border-rose-200'
                  }`}>
                    {matchedMachine ? (
                      <>
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[11px] font-bold">
                            {matchedMachine.machine_no}
                          </span>
                          <span className="text-slate-700 font-mono text-[11px]">
                            Needles: <strong>{matchedMachine.needles}</strong> | Signed Job: <strong>{matchedMachine.job_full_text}</strong>
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Machine Verified
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-rose-700 font-medium">
                          Barcode '{machineBarcodeInput}' not signed in system! Please sign machine first in /machine-sign.
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
                          Not Signed
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* ================= RIGHT SECTION: COMPLETE DETAILS & ALREADY FEEDED ROLLS ================= */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Selected Lot Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-600" />
                Selected Lot Specifications
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                {selectedLot || 'No Lot Selected'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-xs font-mono">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase block">Lot Needles</span>
                <strong className="text-slate-900 text-sm">{currentLotObj?.needles || '--'}</strong>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase block">Bag Shade</span>
                <strong className="text-slate-900 truncate block text-sm">{currentBagObj?.shade || '--'}</strong>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase block">Total Feeded</span>
                <strong className="text-emerald-700 text-sm">
                  {lotFeededRolls.reduce((sum, r) => sum + (Number(r?.weight) || 0), 0).toFixed(1)} KG
                </strong>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase block">Rem Balance</span>
                <strong className="text-slate-900 text-sm">
                  {currentLotObj ? `${Number(currentLotObj.fabric_weight ?? currentLotObj.rem_weight ?? 0).toFixed(1)} KG` : '--'}
                </strong>
              </div>
            </div>
          </div>

          {/* Already Feeded Rolls in Selected Lot Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  Feeded Rolls in this Lot
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Rolls registered for {selectedLot || 'selected lot'}
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                {lotFeededRolls.length} Roll(s)
              </span>
            </div>

            <div className="mt-3 overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-2">Roll #</th>
                    <th className="p-2">Weight</th>
                    <th className="p-2">Tube</th>
                    <th className="p-2">Date / Time</th>
                    <th className="p-2">Barcode</th>
                    <th className="p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {lotFeededRolls.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 font-sans text-xs">
                        Abhi is lot mein koi roll feed nahi hua. Upar form se feed karein.
                      </td>
                    </tr>
                  ) : (
                    lotFeededRolls.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 font-bold text-slate-900 flex items-center gap-1.5">
                          <span>#{r.roll_no}</span>
                          {r.is_merged && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-sans font-bold">
                              Merged
                            </span>
                          )}
                        </td>
                        <td className="p-2 font-black text-emerald-700">
                          {(Number(r?.weight) || 0).toFixed(2)} KG
                        </td>
                        <td className="p-2 text-slate-600">
                          {r.tube_no || 'T-101'}
                        </td>
                        <td className="p-2 text-slate-500 text-[10px]">
                          {r.created_at}
                        </td>
                        <td className="p-2 text-slate-700">
                          {r.roll_barcode}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleReprintRoll(r)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-sans text-[10px] font-semibold flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
                            title="Re-print Thermal Sticker"
                          >
                            <Printer className="w-3 h-3 text-slate-600" />
                            <span>Sticker</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* ================= SPECIFICATION MISMATCH ALERT POPUP MODAL ================= */}
      {mismatchError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full border-2 border-rose-500 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-rose-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">{mismatchError.title}</h3>
                  <p className="text-[11px] text-rose-100">Roll feed nahi ho sakta jab tak Machine Barcode match na ho</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMismatchError(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-sans">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-medium flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div>{mismatchError.message}</div>
              </div>

              {mismatchError.machineSpec && mismatchError.lotSpec && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 block mb-1">
                      Chuna Hua Lot Spec:
                    </span>
                    <div className="space-y-1 font-mono text-[11px]">
                      <div>Needles: <strong>{mismatchError.lotSpec.needles}</strong></div>
                      <div>Shade: <strong>{mismatchError.lotSpec.shade}</strong></div>
                      <div>WO: <strong>{mismatchError.lotSpec.work_order}</strong></div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-rose-600 block mb-1">
                      Signed Machine Barcode ({mismatchError.machineSpec.unique_code}):
                    </span>
                    <div className="space-y-1 font-mono text-[11px]">
                      <div>Needles: <strong>{mismatchError.machineSpec.needles}</strong></div>
                      <div>Machine: <strong>{mismatchError.machineSpec.machine_no}</strong></div>
                      <div>WO: <strong>{mismatchError.machineSpec.work_order}</strong></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <span className="text-[11px]">
                  <strong>Hal (Solution):</strong> Agar machine par doosra shade ya needle lagi hai, pehle <strong>/machine-sign</strong> par jakar nayi machine sign in karein aur waha se hasil shuda 5-digit barcode enter karein.
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setMismatchError(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Theek Hai / Samajh Gaya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= INSTANT PRINTABLE THERMAL STICKER MODAL ================= */}
      <ThermalStickerModal
        sticker={activeSticker}
        onClose={() => setActiveSticker(null)}
      />
    </div>
  );
};
