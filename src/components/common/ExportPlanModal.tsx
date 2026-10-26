import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TableProperties,
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';

interface ExportPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultWorkOrder?: string;
}

export const ExportPlanModal: React.FC<ExportPlanModalProps> = ({
  isOpen,
  onClose,
  defaultWorkOrder = ''
}) => {
  const {
    workOrders,
    plans,
    bags,
    lots,
    rolls,
    qualityChecks,
    finalizedBags,
    dispatchRecords
  } = useApp();

  const [woInput, setWoInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync default WO when modal opens or prop changes
  useEffect(() => {
    if (isOpen) {
      setWoInput(defaultWorkOrder || '');
      setIsLoading(false);
      setIsSuccess(false);
      setErrorMessage(null);
      setProgressPercent(0);
      setActiveStep(1);
    }
  }, [isOpen, defaultWorkOrder]);

  if (!isOpen) return null;

  // Autocomplete work order list
  const availableWorkOrders = Array.from(
    new Set([
      ...workOrders.map(w => w.work_order),
      ...rolls.map(r => r.work_order).filter(Boolean)
    ])
  ).filter(Boolean);

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsSuccess(false);
    setProgressPercent(20);
    setActiveStep(1);

    try {
      // Step 1: Query PPC & Planning Structure
      await new Promise(r => setTimeout(r, 450));
      setProgressPercent(55);
      setActiveStep(2);

      const targetWoClean = woInput.trim().toLowerCase();

      // Find matching work orders
      const matchingWos = targetWoClean
        ? workOrders.filter(w =>
            w.work_order.toLowerCase() === targetWoClean ||
            w.work_order.toLowerCase().includes(targetWoClean) ||
            String(w.id) === targetWoClean
          )
        : workOrders;

      const matchingWoIds = matchingWos.map(w => w.id);
      const matchingWoNames = matchingWos.map(w => w.work_order.toLowerCase());

      // Find plans belonging to matching work orders
      const matchingPlans = targetWoClean
        ? plans.filter(p =>
            matchingWoIds.includes(p.work_order_id) ||
            matchingWoIds.map(String).includes(String(p.work_order_id)) ||
            p.plan_id.toLowerCase().includes(targetWoClean)
          )
        : plans;

      const matchingPlanIds = matchingPlans.map(p => p.id);

      // Find bags
      const matchingBags = targetWoClean
        ? bags.filter(b =>
            matchingPlanIds.includes(b.plan_id) ||
            matchingPlanIds.map(String).includes(String(b.plan_id)) ||
            rolls.some(r =>
              r.work_order.toLowerCase() === targetWoClean &&
              r.bag_number.toLowerCase() === b.bag_number.toLowerCase()
            )
          )
        : bags;

      // Group data by Bag
      type LotData = {
        lot_name: string;
        needles: string;
        plan_weight: number;
        produced_weight: number;
        quality_weight: number;
        dispatched_weight: number;
      };

      type BagData = {
        work_order: string;
        bag_number: string;
        plan_id: string;
        shade: string;
        needles: string;
        lots: Map<string, LotData>;
      };

      const bagsMap = new Map<string, BagData>();

      // 1. Fill from PPC Lots & Bags
      matchingBags.forEach(b => {
        const bNo = b.bag_number.trim();
        const planObj = plans.find(p => p.id === b.plan_id || String(p.id) === String(b.plan_id));
        const woObj = planObj ? workOrders.find(w => w.id === planObj.work_order_id || String(w.id) === String(planObj.work_order_id)) : null;

        const bagEntry: BagData = {
          work_order: woObj ? woObj.work_order : (woInput.trim() || 'WO-101'),
          bag_number: bNo,
          plan_id: planObj ? planObj.plan_id : 'Plan-1',
          shade: b.shade || 'White',
          needles: '24N',
          lots: new Map<string, LotData>()
        };

        // Find lots for this bag
        const bagLots = lots.filter(l => l.bag_id === b.id || String(l.bag_id) === String(b.id));
        bagLots.forEach(l => {
          const lName = l.lot_name.trim();
          bagEntry.lots.set(lName, {
            lot_name: lName,
            needles: l.needles || '24N',
            plan_weight: Number(l.plan_weight || l.fabric_weight || 0),
            produced_weight: 0,
            quality_weight: 0,
            dispatched_weight: 0
          });
          if (l.needles) bagEntry.needles = l.needles;
        });

        bagsMap.set(bNo.toLowerCase(), bagEntry);
      });

      // 2. Aggregate Rolls Data (Produced, Quality, Dispatched)
      await new Promise(r => setTimeout(r, 450));
      setProgressPercent(80);
      setActiveStep(3);

      const targetRolls = targetWoClean
        ? rolls.filter(r =>
            r.work_order.toLowerCase() === targetWoClean ||
            matchingWoNames.includes(r.work_order.toLowerCase())
          )
        : rolls;

      targetRolls.forEach(r => {
        const bKey = r.bag_number.trim().toLowerCase();
        let bagEntry = bagsMap.get(bKey);

        if (!bagEntry) {
          bagEntry = {
            work_order: r.work_order,
            bag_number: r.bag_number,
            plan_id: r.plan_id || 'Plan-1',
            shade: bags.find(b => b.bag_number.toLowerCase() === bKey)?.shade || 'White',
            needles: r.needles || '24N',
            lots: new Map<string, LotData>()
          };
          bagsMap.set(bKey, bagEntry);
        }

        const lKey = (r.lot_name || 'Lot-1').trim();
        let lotEntry = bagEntry.lots.get(lKey);
        if (!lotEntry) {
          lotEntry = {
            lot_name: lKey,
            needles: r.needles || bagEntry.needles,
            plan_weight: 0,
            produced_weight: 0,
            quality_weight: 0,
            dispatched_weight: 0
          };
          bagEntry.lots.set(lKey, lotEntry);
        }

        // Produced Weight
        const rollWeight = Number(r.weight || 0);
        lotEntry.produced_weight += rollWeight;

        // Quality Weight
        const qc = qualityChecks.find(q => q.roll_id === r.roll_barcode);
        const qw = qc ? Number(qc.grade_a_weight || 0) : 0;
        lotEntry.quality_weight += qw;

        // Dispatched Weight
        const isDispatched =
          (qc && qc.in_store === 2) ||
          finalizedBags.some(fb => fb.bag_number.toLowerCase() === bKey && fb.status === 'Dispatched') ||
          dispatchRecords.some(d => d.bag_number.toLowerCase() === bKey);

        if (isDispatched) {
          lotEntry.dispatched_weight += qw > 0 ? qw : rollWeight;
        }
      });

      // Step 3: Build Structured Excel Worksheet matching exact specifications
      await new Promise(r => setTimeout(r, 400));
      setProgressPercent(95);

      const rows: any[][] = [];
      const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];

      // Row 1: Header Columns
      const headers = [
        'Work Order',
        'Bag Number',
        'Plan ID',
        'Shade',
        'Needle',
        'Lot',
        'Planned Weight (KG)',
        'Produced Weight (KG)',
        'Quality Weight (KG)',
        'Dispatched Weight (KG)'
      ];
      rows.push(headers);

      let grandTotalPlanned = 0;
      let grandTotalProduced = 0;
      let grandTotalQuality = 0;
      let grandTotalDispatched = 0;

      if (bagsMap.size === 0) {
        rows.push([
          `No production plans or feeded rolls found for '${woInput || 'All Orders'}'`,
          '', '', '', '', '', '', '', '', ''
        ]);
        merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 9 } });
      } else {
        Array.from(bagsMap.values()).forEach(bag => {
          const currentBadgeRow = rows.length;

          // Prominent Bag Badge Row across columns 0 to 9
          const badgeText = `🏷️  BAG / BADGE #${bag.bag_number}    |    PLAN ID: ${bag.plan_id}    |    SHADE: ${bag.shade}    |    NEEDLES: ${bag.needles}`;
          rows.push([badgeText, '', '', '', '', '', '', '', '', '']);
          merges.push({ s: { r: currentBadgeRow, c: 0 }, e: { r: currentBadgeRow, c: 9 } });

          let bagPlanned = 0;
          let bagProduced = 0;
          let bagQuality = 0;
          let bagDispatched = 0;

          const lotEntries = Array.from(bag.lots.values());
          if (lotEntries.length === 0) {
            rows.push([
              bag.work_order,
              bag.bag_number,
              bag.plan_id,
              bag.shade,
              bag.needles,
              'Pending Lots',
              0,
              0,
              0,
              0
            ]);
          } else {
            lotEntries.forEach(lot => {
              bagPlanned += lot.plan_weight;
              bagProduced += lot.produced_weight;
              bagQuality += lot.quality_weight;
              bagDispatched += lot.dispatched_weight;

              rows.push([
                bag.work_order,
                bag.bag_number,
                bag.plan_id,
                bag.shade,
                lot.needles || bag.needles,
                lot.lot_name,
                Number(lot.plan_weight.toFixed(2)),
                Number(lot.produced_weight.toFixed(2)),
                Number(lot.quality_weight.toFixed(2)),
                Number(lot.dispatched_weight.toFixed(2))
              ]);
            });
          }

          // Bag Subtotal Row
          const subtotalRowIndex = rows.length;
          rows.push([
            `SUBTOTAL FOR BAG #${bag.bag_number}:`,
            '', '', '', '', '',
            Number(bagPlanned.toFixed(2)),
            Number(bagProduced.toFixed(2)),
            Number(bagQuality.toFixed(2)),
            Number(bagDispatched.toFixed(2))
          ]);
          merges.push({ s: { r: subtotalRowIndex, c: 0 }, e: { r: subtotalRowIndex, c: 5 } });

          grandTotalPlanned += bagPlanned;
          grandTotalProduced += bagProduced;
          grandTotalQuality += bagQuality;
          grandTotalDispatched += bagDispatched;

          // Blank spacer row
          rows.push(['', '', '', '', '', '', '', '', '', '']);
        });

        // Overall Work Order Grand Total Row
        const grandTotalRowIndex = rows.length;
        const grandTitle = `⭐ OVERALL WORK ORDER TOTAL (${woInput.trim() || 'ALL ORDERS'}):`;
        rows.push([
          grandTitle,
          '', '', '', '', '',
          Number(grandTotalPlanned.toFixed(2)),
          Number(grandTotalProduced.toFixed(2)),
          Number(grandTotalQuality.toFixed(2)),
          Number(grandTotalDispatched.toFixed(2))
        ]);
        merges.push({ s: { r: grandTotalRowIndex, c: 0 }, e: { r: grandTotalRowIndex, c: 5 } });
      }

      // Create sheet and workbook
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!merges'] = merges;
      ws['!cols'] = [
        { wch: 18 }, // Work Order
        { wch: 16 }, // Bag Number
        { wch: 15 }, // Plan ID
        { wch: 16 }, // Shade
        { wch: 12 }, // Needle
        { wch: 16 }, // Lot
        { wch: 22 }, // Planned Weight
        { wch: 22 }, // Produced Weight
        { wch: 22 }, // Quality Weight
        { wch: 22 }  // Dispatched Weight
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Plan Export');

      // Generate filename
      const safeWo = (woInput.trim() || 'All_Plans').replace(/[\/\\?%*:|"<>]/g, '_');
      const filename = `plan_export_${safeWo}.xlsx`;

      XLSX.writeFile(wb, filename);

      setProgressPercent(100);
      setIsSuccess(true);
      setTimeout(() => {
        setIsLoading(false);
        onClose();
      }, 1400);

    } catch (err: any) {
      console.error('Export Plan Error:', err);
      setIsLoading(false);
      setErrorMessage(err.message || 'Failed to generate Plan Excel file.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-all animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-inner">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight text-white">
                  Export Production Plan
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  .XLSX
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80">
                Multi-Level Lot Breakdown with Bag Badges, Subtotals &amp; Grand Totals
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {!isLoading && !isSuccess ? (
          <div className="p-5 space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Work Order (WO) Number <span className="text-rose-500">*</span></span>
                <span className="text-[10px] font-normal text-slate-400">Type or select below</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="export_wo_list"
                  value={woInput}
                  onChange={e => setWoInput(e.target.value)}
                  placeholder="e.g. WO-101 (or leave blank to export all orders)"
                  className="w-full px-3.5 py-2.5 border-2 border-slate-300 rounded-xl text-xs font-mono font-bold uppercase bg-slate-50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                  autoFocus
                />
                <datalist id="export_wo_list">
                  {availableWorkOrders.map((wo, i) => (
                    <option key={i} value={wo} />
                  ))}
                </datalist>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Leave empty to generate a full consolidated export of all Work Orders.
              </p>
            </div>

            {/* Layout Specification Preview */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-2.5 text-xs">
              <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <TableProperties className="w-4 h-4 text-emerald-600" />
                <span>Workbook Output Structure:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="font-bold text-slate-800 block mb-1">Row 1: Column Headers</span>
                  WO &bull; Bag # &bull; Plan ID &bull; Shade &bull; Needle &bull; Lot &bull; Planned Wt &bull; Produced Wt &bull; Quality Wt &bull; Dispatched Wt
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="font-bold text-slate-800 block mb-1">Bag Badges &amp; Subtotals</span>
                  Large Badge Banner per Bag &bull; Lot-wise metrics &bull; Bag subtotal &bull; End-of-sheet Grand Total
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer border border-emerald-800"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Generate Plan Excel</span>
              </button>
            </div>
          </div>
        ) : isLoading ? (
          /* Responsive Loading Animation & Steps */
          <div className="p-8 text-center space-y-5 animate-in fade-in duration-150">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
              <div
                className="absolute inset-2 rounded-full border-4 border-teal-100 border-b-teal-500 animate-spin"
                style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-emerald-700">
                <FileSpreadsheet className="w-6 h-6 animate-pulse" />
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">
                Generating Plan Excel Workbook...
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                Compiling production lots &amp; bag badges for{' '}
                <span className="font-bold text-slate-800 font-mono">
                  {woInput.trim() ? woInput.trim() : 'All Orders'}
                </span>
              </p>
            </div>

            {/* Striped Animated Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Step Progression Indicators */}
            <div className="text-[11px] text-left max-w-xs mx-auto space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className={`flex items-center gap-2 ${activeStep >= 1 ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
                {activeStep > 1 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                )}
                <span>1. Reading PPC plan targets &amp; lot bags</span>
              </div>

              <div className={`flex items-center gap-2 ${activeStep >= 2 ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
                {activeStep > 2 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : activeStep === 2 ? (
                  <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                )}
                <span>2. Aggregating feeded roll weights &amp; quality checks</span>
              </div>

              <div className={`flex items-center gap-2 ${activeStep >= 3 ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
                {progressPercent === 100 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : activeStep === 3 ? (
                  <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                )}
                <span>3. Formatting Bag badges &amp; subtotal rows</span>
              </div>
            </div>
          </div>
        ) : (
          /* Success State */
          <div className="p-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-100 border-2 border-emerald-300 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner animate-bounce">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-slate-900">
                Workbook Generated &amp; Downloaded!
              </h4>
              <p className="text-xs text-slate-500">
                Your structured Plan Excel file has been downloaded successfully.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
