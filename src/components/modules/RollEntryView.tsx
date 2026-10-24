import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { RollSticker, FabricRoll } from '../../types';
import { ThermalStickerModal } from '../common/ThermalStickerModal';
import {
  ScrollText, Printer, Layers, Tag, Cpu, RefreshCw, Copy, Check,
  AlertTriangle, CheckCircle2, XCircle, ArrowRight, FileText,
  Filter, Info, ShieldCheck, ChevronRight, Hash, Database
} from 'lucide-react';

export const RollEntryView: React.FC = () => {
  const {
    workOrders, plans, bags, lots, finalizedBags,
    getLotsForBag, saveRoll, machineAssignments, rolls
  } = useApp();

  // Filter mode: Complete Series Only vs All PPC Work Orders
  const [completeSeriesOnly, setCompleteSeriesOnly] = useState<boolean>(false);

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
      const woPlans = plans.filter(p => p.work_order_id === wo.id || String(p.work_order_id) === String(wo.id));
      if (woPlans.length === 0) return false;

      const woPlanIds = woPlans.map(p => p.id);
      const woBags = bags.filter(b => woPlanIds.includes(b.plan_id) || woPlanIds.map(String).includes(String(b.plan_id)));
      if (woBags.length === 0) return false;

      const woBagIds = woBags.map(b => b.id);
      const woLots = lots.filter(l => woBagIds.includes(l.bag_id) || woBagIds.map(String).includes(String(l.bag_id)));
      if (woLots.length === 0) return false;

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

  // Set default WO on initial load if none selected
  useEffect(() => {
    if (!woInput && displayedWorkOrders.length > 0) {
      const defaultWo = displayedWorkOrders[0].work_order;
      setWoInput(defaultWo);
    }
  }, [displayedWorkOrders, woInput]);

  // Robust matching for Plans belonging to the selected Work Order
  const availablePlans = useMemo(() => {
    if (!woInput.trim()) return [];
    const rawWo = woInput.trim();
    const cleanWo = rawWo.toLowerCase().split('/').pop()?.trim() || rawWo.toLowerCase();

    // Match work order by name or ID
    const woObj = workOrders.find(w =>
      w.work_order.toLowerCase().trim() === cleanWo ||
      w.work_order.toLowerCase().trim() === rawWo.toLowerCase() ||
      String(w.id) === cleanWo ||
      cleanWo.includes(w.work_order.toLowerCase().trim()) ||
      w.work_order.toLowerCase().trim().includes(cleanWo)
    );

    return plans.filter(p => {
      if (woObj && (p.work_order_id === woObj.id || String(p.work_order_id) === String(woObj.id))) return true;
      if (String(p.work_order_id).toLowerCase() === cleanWo) return true;
      if ((p as any).work_order && (p as any).work_order.toLowerCase().trim() === cleanWo) return true;
      // Also match by plan_id naming pattern if it contains WO numbers
      const numPart = cleanWo.replace(/\D/g, '');
      if (numPart && numPart.length >= 3 && p.plan_id.toLowerCase().includes(numPart)) return true;
      return false;
    });
  }, [woInput, workOrders, plans]);

  // Effect 1: Auto-select or maintain Plan when availablePlans changes
  useEffect(() => {
    if (availablePlans.length > 0) {
      const exists = availablePlans.some(p => p.plan_id.toLowerCase().trim() === selectedPlan.toLowerCase().trim());
      if (!exists) {
        setSelectedPlan(availablePlans[0].plan_id);
      }
    } else {
      setSelectedPlan('');
    }
  }, [availablePlans, selectedPlan]);

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

  // Effect 2: Auto-select or maintain Bag when availableBags changes
  useEffect(() => {
    if (availableBags.length > 0) {
      const exists = availableBags.some(b => b.bag_number.toLowerCase().trim() === selectedBag.toLowerCase().trim());
      if (!exists) {
        setSelectedBag(availableBags[0].bag_number);
      }
    } else {
      setSelectedBag('');
    }
  }, [availableBags, selectedBag]);

  // Active Bag Object
  const currentBagObj = useMemo(() => {
    if (!selectedBag) return null;
    const clean = selectedBag.split('(')[0].trim().toLowerCase();
    return bags.find(b =>
      b.bag_number.trim().toLowerCase() === clean ||
      b.bag_number.trim().toLowerCase() === selectedBag.trim().toLowerCase() ||
      String(b.id) === clean ||
      String(b.id) === selectedBag.trim()
    ) || null;
  }, [selectedBag, bags]);

  // Available Lots: DIRECTLY derived from activeBagObj and lots with fallback to getLotsForBag
  const availableLots = useMemo(() => {
    if (!selectedBag) return [];

    // First attempt: direct lookup via activeBagObj and lots state
    if (currentBagObj) {
      const bagIdStr = String(currentBagObj.id);
      const bagNoClean = currentBagObj.bag_number.trim().toLowerCase();
      const matchedLots = lots.filter(l => {
        if (l.bag_id === currentBagObj.id) return true;
        if (String(l.bag_id) === bagIdStr) return true;
        if ((l as any).bag_number && String((l as any).bag_number).trim().toLowerCase() === bagNoClean) return true;
        return false;
      });

      if (matchedLots.length > 0) {
        return matchedLots.map(l => {
          const lotRolls = rolls.filter(r =>
            (r.bag_number?.trim().toLowerCase() === bagNoClean || r.bag_number?.trim().toLowerCase() === selectedBag.trim().toLowerCase()) &&
            r.lot_name?.trim().toLowerCase() === l.lot_name.trim().toLowerCase()
          );
          const lastRollWithBarcode = lotRolls.find(r => r.barcode_used);
          const mAssigned = lastRollWithBarcode ? machineAssignments.find(m => m.unique_code === lastRollWithBarcode.barcode_used) : null;
          return {
            id: l.id,
            bag_id: l.bag_id,
            lot_name: l.lot_name,
            needles: l.needles || '24N',
            fabric_weight: Number(l.fabric_weight ?? l.rem_weight ?? 0),
            rem_weight: Number(l.fabric_weight ?? l.rem_weight ?? 0),
            plan_weight: Number(l.plan_weight ?? 0),
            barcode: lastRollWithBarcode?.barcode_used || null,
            machine_no: mAssigned?.machine_no || null,
            roll_count: lotRolls.length
          };
        });
      }
    }

    // Fallback: call helper from AppContext
    return getLotsForBag(selectedBag);
  }, [currentBagObj, lots, rolls, machineAssignments, selectedBag, getLotsForBag]);

  // Effect 3: Auto-select or maintain Lot when availableLots changes
  useEffect(() => {
    if (availableLots.length > 0) {
      const exists = availableLots.some(l => l.lot_name.toLowerCase().trim() === selectedLot.toLowerCase().trim());
      if (!exists) {
        setSelectedLot(availableLots[0].lot_name);
      }
    } else {
      setSelectedLot('');
    }
  }, [availableLots, selectedLot]);

  // Current Lot Object
  const currentLotObj = useMemo(() => {
    if (!selectedLot) return null;
    return availableLots.find(l => l.lot_name.toLowerCase().trim() === selectedLot.toLowerCase().trim()) || null;
  }, [availableLots, selectedLot]);

  // Feeded Rolls for the selected Lot
  const lotFeededRolls = useMemo(() => {
    if (!woInput || !selectedBag || !selectedLot) return [];
    const cleanWo = woInput.trim().toLowerCase();
    const cleanBag = selectedBag.trim().toLowerCase();
    const cleanLot = selectedLot.trim().toLowerCase();

    return rolls.filter(r =>
      r.work_order.toLowerCase().trim() === cleanWo &&
      (r.bag_number.toLowerCase().trim() === cleanBag || (currentBagObj && r.bag_number.toLowerCase().trim() === currentBagObj.bag_number.toLowerCase().trim())) &&
      r.lot_name.toLowerCase().trim() === cleanLot
    );
  }, [rolls, woInput, selectedBag, selectedLot, currentBagObj]);

  // Latest Roll info in this lot (for 1-line metallic summary strip)
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

  // When user presses Enter or changes Work Order
  const handleWoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      planSelectRef.current?.focus();
    }
  };

  // Plan Selection handler
  const handlePlanChange = (planId: string) => {
    setSelectedPlan(planId);
    bagSelectRef.current?.focus();
  };

  // Bag Selection handler
  const handleBagChange = (bagNo: string) => {
    setSelectedBag(bagNo);
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
    <div className="space-y-4 font-sans text-slate-800">
      
      {/* Top Header Bar - Java Oracle ERP Silver Metallic */}
      <div className="p-3.5 sm:p-4 rounded-xl border border-slate-400/80 bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_4px_rgba(0,0,0,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-slate-200 to-slate-400 border border-slate-500 flex items-center justify-center text-slate-800 shadow-inner">
            <ScrollText className="w-4 h-4 text-blue-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">
                Oracle Form TX-301
              </span>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                Fabric Roll Feeding Station (/roll-entry)
              </h1>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              Enterprise Work Order &rarr; Plan &rarr; Bag &rarr; Lot &rarr; Machine Verification with instant 5-row barcode thermal sticker.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Filter Toggle: Complete Series vs All Work Orders */}
          <button
            type="button"
            onClick={() => setCompleteSeriesOnly(prev => !prev)}
            className={`px-3 py-1.5 rounded text-xs font-bold border transition-all cursor-pointer shadow-xs ${
              completeSeriesOnly
                ? 'bg-gradient-to-b from-blue-700 to-blue-900 text-white border-blue-950 shadow-inner'
                : 'bg-gradient-to-b from-slate-100 to-slate-300 hover:from-white hover:to-slate-200 text-slate-800 border-slate-400'
            }`}
            title="Toggle Complete Series Filter"
          >
            <span className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              <span>{completeSeriesOnly ? 'Complete Series Only' : 'All PPC Work Orders'}</span>
            </span>
          </button>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-b from-slate-100 to-slate-200 text-slate-800 text-[11px] font-bold rounded border border-slate-400 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            Reactive Cascade Active
          </span>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

        {/* ================= LEFT SECTION: FEED FORM & CONTROLS ================= */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-slate-400/80 bg-gradient-to-b from-slate-100 via-slate-200 to-slate-100 p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.06)] space-y-4">
            
            {/* Section Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-300">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-900" />
                Roll Feed Entry Form
              </h2>
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                  availablePlans.length > 0
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  {availablePlans.length > 0 ? `${availablePlans.length} Plan(s) Loaded` : 'No Plans Found'}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                  availableLots.length > 0
                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                    : 'bg-slate-200 text-slate-600 border-slate-300'
                }`}>
                  {availableLots.length} Lot(s) Ready
                </span>
              </div>
            </div>

            <form onSubmit={handleFeedRoll} className="space-y-4">
              
              {/* PEHLI ROW: 4 Cascading Dropdowns/Inputs in One Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
                
                {/* 1. Work Order Box (Enter or Select) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-black uppercase text-slate-800">
                      1. Work Order <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-[9px] text-slate-500 font-mono">Enter &crarr;</span>
                  </div>
                  <input
                    type="text"
                    list="wo_datalist"
                    value={woInput}
                    onChange={e => setWoInput(e.target.value)}
                    onKeyDown={handleWoKeyDown}
                    placeholder="Enter or select WO..."
                    className="w-full px-2.5 py-1.5 border-2 border-slate-400 rounded text-xs font-mono font-bold uppercase bg-white text-slate-900 shadow-inner focus:border-blue-700 focus:ring-1 focus:ring-blue-700 focus:outline-hidden"
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
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-black uppercase text-slate-800">
                      2. Plan ID <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-[9px] text-blue-900 font-mono font-bold">
                      {availablePlans.length} plan(s)
                    </span>
                  </div>
                  <select
                    ref={planSelectRef}
                    value={selectedPlan}
                    disabled={availablePlans.length === 0}
                    onChange={e => handlePlanChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 border-2 border-slate-400 rounded text-xs font-mono font-bold bg-white text-slate-900 disabled:bg-slate-200 disabled:text-slate-500 shadow-inner focus:border-blue-700 focus:ring-1 focus:ring-blue-700 focus:outline-hidden cursor-pointer"
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
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-black uppercase text-slate-800">
                      3. Bag / Badge <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-[9px] text-blue-900 font-mono font-bold">
                      {availableBags.length} bag(s)
                    </span>
                  </div>
                  <select
                    ref={bagSelectRef}
                    value={selectedBag}
                    disabled={availableBags.length === 0}
                    onChange={e => handleBagChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 border-2 border-slate-400 rounded text-xs font-mono font-bold bg-white text-slate-900 disabled:bg-slate-200 disabled:text-slate-500 shadow-inner focus:border-blue-700 focus:ring-1 focus:ring-blue-700 focus:outline-hidden cursor-pointer"
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
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-black uppercase text-slate-800">
                      4. Target Lot <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-[9px] text-emerald-800 font-mono font-bold">
                      {availableLots.length} lot(s)
                    </span>
                  </div>
                  <select
                    ref={lotSelectRef}
                    value={selectedLot}
                    disabled={availableLots.length === 0}
                    onChange={e => handleLotChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 border-2 border-slate-400 rounded text-xs font-mono font-bold bg-white text-slate-900 disabled:bg-slate-200 disabled:text-slate-500 shadow-inner focus:border-blue-700 focus:ring-1 focus:ring-blue-700 focus:outline-hidden cursor-pointer"
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
              {latestRoll ? (
                <div className="p-2.5 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded border border-slate-600 shadow-md animate-in fade-in duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-slate-300 uppercase font-bold tracking-wide">Already Feed Barcode:</span>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono font-bold rounded border border-emerald-500/40 text-xs">
                        {latestRoll.roll_barcode}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyStripBarcode}
                        className="px-2 py-0.5 text-[10px] bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors flex items-center gap-1 cursor-pointer font-bold border border-slate-500 shadow-xs"
                        title="Copy Roll Barcode"
                      >
                        {copiedStrip ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedStrip ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                      <div className="px-2 py-0.5 bg-slate-900/80 rounded border border-slate-600">
                        <span className="text-slate-400 text-[10px]">Job/WO: </span>
                        <strong className="text-white">{`Job-1/${woInput}`}</strong>
                      </div>
                      <div className="px-2 py-0.5 bg-slate-900/80 rounded border border-slate-600">
                        <span className="text-slate-400 text-[10px]">Shade: </span>
                        <strong className="text-amber-300">{currentBagObj?.shade || '--'}</strong>
                      </div>
                      <div className="px-2 py-0.5 bg-slate-900/80 rounded border border-slate-600">
                        <span className="text-slate-400 text-[10px]">Machine: </span>
                        <strong className="text-emerald-400">{latestRoll.machine_no || 'M-01'}</strong>
                      </div>
                      <div className="px-2 py-0.5 bg-slate-900/80 rounded border border-slate-600">
                        <span className="text-slate-400 text-[10px]">Needles: </span>
                        <strong className="text-white">{currentLotObj?.needles || '24N'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 rounded border border-slate-400 text-xs flex items-center justify-between font-mono">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Strip Summary: Ready to feed first roll for {selectedLot || 'selected lot'}.
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300 font-bold">
                    Needles: {currentLotObj?.needles || '24N'} | Shade: {currentBagObj?.shade || '--'}
                  </span>
                </div>
              )}

              {/* NEXT ROW: Roll Number, Roll Weight, Tube No, Machine Barcode, Submit Button */}
              <div className="pt-2.5 border-t border-slate-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2.5 items-end">
                  
                  {/* Roll Number Box */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-black uppercase text-slate-800">
                        Roll Number
                      </label>
                      <span className="text-[9px] text-blue-900 font-mono font-bold">
                        Auto: 1, 2, 3..
                      </span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={rollNoInput}
                      onChange={e => setRollNoInput(e.target.value)}
                      placeholder="Auto (1, 2..)"
                      className="w-full px-2.5 py-1.5 border-2 border-slate-400 rounded text-xs font-mono font-bold text-slate-900 bg-white shadow-inner focus:border-blue-700 focus:ring-1 focus:ring-blue-700 focus:outline-hidden"
                    />
                  </div>

                  {/* Roll Weight Box */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black uppercase text-slate-800">
                      Roll Weight (KG) <span className="text-rose-600">*</span>
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
                      className="w-full px-2.5 py-1.5 border-2 border-slate-400 rounded text-xs font-mono font-bold text-slate-900 bg-emerald-50/50 shadow-inner focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden"
                    />
                  </div>

                  {/* Tube Box */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black uppercase text-slate-800">
                      Tube No
                    </label>
                    <input
                      type="text"
                      value={tubeInput}
                      onChange={e => setTubeInput(e.target.value)}
                      placeholder="T-101"
                      className="w-full px-2.5 py-1.5 border-2 border-slate-400 rounded text-xs font-mono uppercase bg-white shadow-inner focus:border-blue-700 focus:ring-1 focus:ring-blue-700 focus:outline-hidden"
                    />
                  </div>

                  {/* Machine Sign Barcode (5-Digit) Box */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-black uppercase text-slate-800">
                        Machine Barcode <span className="text-rose-600">*</span>
                      </label>
                      <span className="text-[9px] text-slate-600 font-mono font-bold">5-Digits</span>
                    </div>
                    <input
                      type="text"
                      maxLength={5}
                      required
                      value={machineBarcodeInput}
                      onChange={e => setMachineBarcodeInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 54219"
                      className="w-full px-2.5 py-1.5 border-2 border-slate-400 rounded text-xs font-mono font-bold tracking-widest uppercase bg-amber-50/60 text-slate-900 shadow-inner focus:border-blue-700 focus:ring-1 focus:ring-blue-700 focus:outline-hidden"
                    />
                  </div>

                  {/* Submit Button ("Feed Roll") - Java Oracle ERP Style */}
                  <div>
                    <button
                      type="submit"
                      className="w-full py-2 px-3 bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white rounded text-xs font-black uppercase tracking-wider transition-all border border-emerald-900 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:shadow-inner"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Feed Roll</span>
                    </button>
                  </div>
                </div>

                {/* Merge Notification Notice */}
                {isMergedDetected && (
                  <div className="mt-2.5 p-2.5 bg-gradient-to-r from-amber-100 to-amber-200 border border-amber-400 rounded text-xs text-amber-950 flex items-center gap-2 shadow-xs animate-in fade-in duration-150">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      <strong>Notice:</strong> Roll #{rollNoInput} already exists in this Lot. Submitting will <strong>merge +{weightInput} KG</strong> into the existing roll!
                    </span>
                  </div>
                )}

                {/* Live Machine Barcode Verification Status */}
                {machineBarcodeInput.length === 5 && (
                  <div className={`mt-2.5 p-2.5 rounded border text-xs flex items-center justify-between gap-2 ${
                    matchedMachine
                      ? 'bg-gradient-to-r from-emerald-100 to-emerald-200 border-emerald-400 text-emerald-950'
                      : 'bg-gradient-to-r from-rose-100 to-rose-200 border-rose-400 text-rose-950'
                  }`}>
                    {matchedMachine ? (
                      <>
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-white font-mono text-[11px] font-bold border border-slate-600">
                            {matchedMachine.machine_no}
                          </span>
                          <span className="font-mono text-[11px]">
                            Needles: <strong>{matchedMachine.needles}</strong> | Signed Job: <strong>{matchedMachine.job_full_text}</strong>
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-700 text-white flex items-center gap-1 border border-emerald-900">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Machine Verified
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-rose-900">
                          Barcode '{machineBarcodeInput}' not signed in system! Please sign machine first in /machine-sign.
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-700 text-white border border-rose-900">
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
          <div className="rounded-xl border border-slate-400/80 bg-gradient-to-b from-slate-100 via-slate-200 to-slate-100 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-300">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-900" />
                Selected Lot Specifications
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white text-slate-900 border border-slate-300 shadow-2xs">
                {selectedLot || 'No Lot Selected'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 text-xs font-mono">
              <div className="p-2 bg-white rounded border border-slate-300 shadow-2xs">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Lot Needles</span>
                <strong className="text-slate-900 text-sm">{currentLotObj?.needles || '--'}</strong>
              </div>
              <div className="p-2 bg-white rounded border border-slate-300 shadow-2xs">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Bag Shade</span>
                <strong className="text-slate-900 truncate block text-sm">{currentBagObj?.shade || '--'}</strong>
              </div>
              <div className="p-2 bg-white rounded border border-slate-300 shadow-2xs">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Feeded</span>
                <strong className="text-emerald-800 text-sm">
                  {lotFeededRolls.reduce((sum, r) => sum + (Number(r?.weight) || 0), 0).toFixed(1)} KG
                </strong>
              </div>
              <div className="p-2 bg-white rounded border border-slate-300 shadow-2xs">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Rem Balance</span>
                <strong className="text-blue-900 text-sm">
                  {currentLotObj ? `${Number(currentLotObj.fabric_weight ?? currentLotObj.rem_weight ?? 0).toFixed(1)} KG` : '--'}
                </strong>
              </div>
            </div>
          </div>

          {/* Already Feeded Rolls in Selected Lot Table */}
          <div className="rounded-xl border border-slate-400/80 bg-gradient-to-b from-slate-100 via-slate-200 to-slate-100 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-300">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-900" />
                  Feeded Rolls in this Lot
                </h3>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Rolls registered for {selectedLot || 'selected lot'}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white text-slate-800 border border-slate-300 shadow-2xs">
                {lotFeededRolls.length} Roll(s)
              </span>
            </div>

            <div className="mt-2.5 overflow-x-auto max-h-[380px] overflow-y-auto rounded border border-slate-300 bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-gradient-to-b from-slate-300 to-slate-200 text-[10px] font-black text-slate-800 uppercase sticky top-0 border-b-2 border-slate-400 shadow-xs">
                  <tr>
                    <th className="p-2">Roll #</th>
                    <th className="p-2">Weight</th>
                    <th className="p-2">Tube</th>
                    <th className="p-2">Date / Time</th>
                    <th className="p-2">Barcode</th>
                    <th className="p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {lotFeededRolls.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500 font-sans text-xs bg-slate-50">
                        Abhi is lot mein koi roll feed nahi hua. Upar form se feed karein.
                      </td>
                    </tr>
                  ) : (
                    lotFeededRolls.map(r => (
                      <tr key={r.id} className="hover:bg-blue-50/60 transition-colors even:bg-slate-50/70">
                        <td className="p-2 font-bold text-slate-900 flex items-center gap-1.5">
                          <span>#{r.roll_no}</span>
                          {r.is_merged && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[9px] font-sans font-bold border border-amber-300">
                              Merged
                            </span>
                          )}
                        </td>
                        <td className="p-2 font-black text-emerald-800">
                          {(Number(r?.weight) || 0).toFixed(2)} KG
                        </td>
                        <td className="p-2 text-slate-700">
                          {r.tube_no || 'T-101'}
                        </td>
                        <td className="p-2 text-slate-600 text-[10px]">
                          {r.created_at}
                        </td>
                        <td className="p-2 text-slate-800 font-bold">
                          {r.roll_barcode}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleReprintRoll(r)}
                            className="px-2 py-0.5 bg-gradient-to-b from-slate-100 to-slate-200 hover:from-white hover:to-slate-100 text-slate-800 rounded font-sans text-[10px] font-bold flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer border border-slate-400 shadow-2xs"
                            title="Re-print Thermal Sticker"
                          >
                            <Printer className="w-3 h-3 text-blue-900" />
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
          <div className="bg-white rounded-xl max-w-lg w-full border-2 border-rose-600 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-rose-700 to-rose-900 p-3.5 text-white flex items-center justify-between border-b border-rose-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center text-lg font-bold">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">{mismatchError.title}</h3>
                  <p className="text-[11px] text-rose-200">Roll feed nahi ho sakta jab tak Machine Barcode match na ho</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMismatchError(null)}
                className="text-white/80 hover:text-white p-1 rounded cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs font-sans">
              <div className="p-3 bg-rose-50 border border-rose-300 rounded text-rose-900 font-medium flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div>{mismatchError.message}</div>
              </div>

              {mismatchError.machineSpec && mismatchError.lotSpec && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded bg-slate-100 border border-slate-300">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-slate-700 block mb-1">
                      Chuna Hua Lot Spec:
                    </span>
                    <div className="space-y-1 font-mono text-[11px]">
                      <div>Needles: <strong>{mismatchError.lotSpec.needles}</strong></div>
                      <div>Shade: <strong>{mismatchError.lotSpec.shade}</strong></div>
                      <div>WO: <strong>{mismatchError.lotSpec.work_order}</strong></div>
                    </div>
                  </div>

                  <div className="p-3 rounded bg-rose-50 border border-rose-300">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-rose-700 block mb-1">
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

              <div className="p-2.5 bg-amber-50 rounded border border-amber-300 text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <span className="text-[11px]">
                  <strong>Hal (Solution):</strong> Agar machine par doosra shade ya needle lagi hai, pehle <strong>/machine-sign</strong> par jakar nayi machine sign in karein aur waha se hasil shuda 5-digit barcode enter karein.
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-300 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setMismatchError(null)}
                className="px-4 py-1.5 bg-gradient-to-b from-slate-700 to-slate-900 hover:from-slate-600 hover:to-slate-800 text-white rounded text-xs font-bold cursor-pointer border border-slate-950"
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
