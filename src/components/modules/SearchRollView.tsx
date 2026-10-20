import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ThermalStickerModal } from '../common/ThermalStickerModal';
import { RollSticker } from '../../types';
import {
  Search, QrCode, Layers, Scale, Printer, CheckCircle2,
  AlertCircle, Warehouse, Truck, Clock, Cpu
} from 'lucide-react';

export const SearchRollView: React.FC = () => {
  const { rolls, bags, qualityChecks, finalizedBags } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('7192843');
  const [activeBarcode, setActiveBarcode] = useState<string>('7192843');
  const [showSticker, setShowSticker] = useState<boolean>(false);

  const rollData = rolls.find(r => r.roll_barcode === activeBarcode.trim());
  const bagData = rollData ? bags.find(b => b.bag_number === rollData.bag_number) : null;
  const qcData = rollData ? qualityChecks.find(q => q.roll_id === rollData.roll_barcode) : null;
  const fbData = rollData ? finalizedBags.find(b => b.bag_number === rollData.bag_number) : null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveBarcode(searchQuery.trim());
  };

  const stickerData: RollSticker | null = rollData ? {
    roll_barcode: rollData.roll_barcode,
    bag: rollData.bag_number,
    lot: rollData.lot_name,
    roll_no: rollData.roll_no,
    job_wo: rollData.work_order,
    needle: rollData.needles,
    shade: bagData?.shade || 'Standard',
    machine: rollData.machine_no,
    weight: qcData ? qcData.grade_a_weight : rollData.weight,
    qw: qcData?.grade_a_weight,
    pw: rollData.weight,
    date: rollData.created_at
  } : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Search Fabric Roll Barcode</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Instantly trace the complete genealogy of any manufactured fabric roll across Work Orders, QC, and Logistics.
          </p>
        </div>
      </div>

      {/* Barcode Search Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-end gap-3 max-w-lg">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Enter 7-Digit Roll Barcode
            </label>
            <div className="relative">
              <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="e.g. 7192843"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold tracking-wider uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Search className="w-4 h-4 text-emerald-400" />
            Trace Roll
          </button>
        </form>
      </div>

      {/* Result Card */}
      {rollData ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  Barcode Found
                </span>
                <span className="font-mono font-black text-lg tracking-wider text-white">
                  *{rollData.roll_barcode}*
                </span>
              </div>
              <span className="text-xs text-slate-400 mt-1 block">
                Work Order: <strong>{rollData.work_order}</strong> &bull; Plan: {rollData.plan_id}
              </span>
            </div>

            <button
              onClick={() => setShowSticker(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Roll Sticker
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-xs">
            {/* Box 1: Production Details */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">Knitting Specs</span>
              <div>
                <span className="text-slate-500 block">Roll Sequence:</span>
                <span className="font-bold text-sm font-mono text-slate-900">Roll #{rollData.roll_no}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Needles Gauge:</span>
                <span className="font-bold font-mono">{rollData.needles}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Machine & Unit:</span>
                <span className="font-bold font-mono">{rollData.machine_no}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Created At:</span>
                <span className="font-mono text-slate-700">{rollData.created_at}</span>
              </div>
            </div>

            {/* Box 2: Bag & Lot */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">Bag & Shade</span>
              <div>
                <span className="text-slate-500 block">Bag Number:</span>
                <span className="font-bold font-mono text-slate-900">{rollData.bag_number}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Lot Name:</span>
                <span className="font-bold font-mono">{rollData.lot_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Fabric Shade:</span>
                <span className="font-bold text-slate-900">{bagData?.shade || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Tube Number:</span>
                <span className="font-mono">{rollData.tube_no || 'Standard'}</span>
              </div>
            </div>

            {/* Box 3: Weight & Quality Check */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">Quality Inspection</span>
              <div>
                <span className="text-slate-500 block">Produced Weight (PW):</span>
                <span className="font-bold font-mono text-slate-900">{rollData.weight.toFixed(2)} KG</span>
              </div>
              <div>
                <span className="text-slate-500 block">Grade-A Weight (QW):</span>
                <span className="font-bold font-mono text-emerald-800">
                  {qcData ? `${qcData.grade_a_weight.toFixed(2)} KG` : 'Awaiting QC'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Grade-B Weight:</span>
                <span className="font-mono">
                  {qcData ? `${qcData.grade_b_weight.toFixed(2)} KG` : '0.00 KG'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">QC Checked Time:</span>
                <span className="font-mono text-[11px] text-slate-600">{qcData?.checked_at || 'Not checked'}</span>
              </div>
            </div>

            {/* Box 4: Logistics Status */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">Logistics Status</span>
              <div>
                <span className="text-slate-500 block">Store Inventory:</span>
                <span className="font-bold">
                  {qcData?.in_store === 1 ? (
                    <span className="text-emerald-700">In Store Stock</span>
                  ) : qcData?.in_store === 2 ? (
                    <span className="text-amber-800">Dispatched to Client</span>
                  ) : (
                    <span className="text-slate-500">In Production Floor</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Parent Bag Finalization:</span>
                <span className="font-bold">{fbData ? fbData.status : 'Pending'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Machine Barcode Used:</span>
                <span className="font-mono font-bold text-emerald-700">{rollData.barcode_used}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        activeBarcode && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-medium text-slate-600">No roll found with barcode "{activeBarcode}"</p>
            <p className="mt-1">Check barcode number or search another roll from recent records.</p>
          </div>
        )
      )}

      {/* Thermal Label Modal */}
      {showSticker && stickerData && (
        <ThermalStickerModal sticker={stickerData} onClose={() => setShowSticker(false)} />
      )}
    </div>
  );
};
