import React from 'react';
import { DispatchRecord, FabricRoll, QualityCheck, Bag } from '../../types';
import { Printer, X, ShieldCheck } from 'lucide-react';

interface Props {
  dispatch: DispatchRecord | null;
  rolls: FabricRoll[];
  qualityChecks: QualityCheck[];
  bags: Bag[];
  onClose: () => void;
}

export const GatePassPrintModal: React.FC<Props> = ({ dispatch, rolls, qualityChecks, bags, onClose }) => {
  if (!dispatch) return null;

  // Filter rolls belonging to this bag
  const bagRolls = rolls.filter(r => r.bag_number === dispatch.bag_number);
  const bag = bags.find(b => b.bag_number === dispatch.bag_number);

  // Group rolls by lot_name
  const groupedLots: { [lot: string]: { roll: FabricRoll; qw: number }[] } = {};
  for (const r of bagRolls) {
    const qc = qualityChecks.find(q => q.roll_id === r.roll_barcode);
    const qw = qc ? qc.grade_a_weight : r.weight;
    const lotName = r.lot_name || 'UNASSIGNED';
    if (!groupedLots[lotName]) groupedLots[lotName] = [];
    groupedLots[lotName].push({ roll: r, qw });
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8 overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-base">Print Delivery Gate Pass</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Official Pass
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Gate Pass Document */}
        <div id="gate-pass-document" className="p-8 font-sans bg-white text-slate-900 text-xs">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">TEXFLOW TEXTILE INDUSTRIES LTD.</h1>
                <p className="text-slate-600 font-medium text-xs">Plot 12-B, Industrial Estate, Manga Mandi, Lahore, Pakistan</p>
                <p className="text-slate-500 text-[11px]">Phone: +92 42 3591-8800 | Email: dispatch@texflowindustries.com</p>
              </div>
              <div className="text-right border-2 border-slate-900 p-2.5 rounded bg-slate-50">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Official Document</span>
                <span className="text-sm font-black text-slate-950 uppercase tracking-wider">OUTWARD GATE PASS</span>
                <span className="block font-mono font-bold text-xs text-slate-800 mt-0.5">{dispatch.gate_pass_no}</span>
              </div>
            </div>
          </div>

          {/* Meta Details Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
            <div>
              <table className="w-full text-xs">
                <tbody>
                  <tr>
                    <td className="py-1 text-slate-500 font-medium w-28">Consignee/Customer:</td>
                    <td className="py-1 font-bold text-slate-900">{dispatch.customer_name}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-500 font-medium">Bag Identification:</td>
                    <td className="py-1 font-mono font-bold text-slate-900">{dispatch.bag_number}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-500 font-medium">Fabric Shade:</td>
                    <td className="py-1 font-semibold text-slate-800">{bag?.shade || 'Standard'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <table className="w-full text-xs">
                <tbody>
                  <tr>
                    <td className="py-1 text-slate-500 font-medium w-28">Vehicle Number:</td>
                    <td className="py-1 font-bold text-slate-900 font-mono uppercase">{dispatch.vehicle_no}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-500 font-medium">Driver Name:</td>
                    <td className="py-1 font-semibold text-slate-900">{dispatch.driver_name}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-500 font-medium">Date & Time:</td>
                    <td className="py-1 font-mono text-slate-800">{dispatch.dispatched_at}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Rolls Breakdown by Lot */}
          <div className="mb-6">
            <h4 className="font-bold uppercase tracking-wider text-slate-800 text-xs mb-2">Itemized Fabric Rolls Breakdown</h4>
            
            {Object.keys(groupedLots).length === 0 ? (
              <div className="p-4 bg-slate-50 border rounded text-center text-slate-500">
                Bag record finalized with {dispatch.total_rolls} rolls ({dispatch.total_weight} KG total)
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedLots).map(([lotName, items]) => {
                  const lotTotal = items.reduce((sum, item) => sum + item.qw, 0);
                  return (
                    <div key={lotName} className="border border-slate-300 rounded overflow-hidden">
                      <div className="bg-slate-200 px-3 py-1.5 flex justify-between font-bold text-slate-800 text-xs">
                        <span>Lot: {lotName} ({items.length} rolls)</span>
                        <span>Lot Total: {lotTotal.toFixed(2)} KG</span>
                      </div>
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-100 text-slate-600 border-b">
                          <tr>
                            <th className="py-1 px-3 w-16">Roll #</th>
                            <th className="py-1 px-3">Barcode</th>
                            <th className="py-1 px-3">Needles</th>
                            <th className="py-1 px-3 text-right">Net Weight (KG)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {items.map(({ roll, qw }, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-1 px-3 font-semibold">#{roll.roll_no}</td>
                              <td className="py-1 px-3 font-mono">{roll.roll_barcode}</td>
                              <td className="py-1 px-3">{roll.needles}</td>
                              <td className="py-1 px-3 text-right font-mono font-semibold">{qw.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Grand Totals */}
          <div className="flex justify-end mb-12">
            <div className="w-64 bg-slate-100 p-3 rounded border border-slate-300">
              <div className="flex justify-between text-xs py-0.5">
                <span className="text-slate-600 font-medium">Total Rolls Count:</span>
                <span className="font-bold text-slate-900">{dispatch.total_rolls} Rolls</span>
              </div>
              <div className="flex justify-between text-xs py-0.5 border-t border-slate-300 mt-1 pt-1">
                <span className="text-slate-900 font-bold">Gross Dispatched Weight:</span>
                <span className="font-black text-slate-950 font-mono text-sm">{dispatch.total_weight.toFixed(2)} KG</span>
              </div>
            </div>
          </div>

          {/* Signature Sign-offs */}
          <div className="grid grid-cols-4 gap-6 pt-6 border-t border-slate-300 text-center text-[10px] text-slate-600">
            <div>
              <div className="border-b border-slate-400 h-10 mb-1" />
              <span className="font-bold text-slate-800 block">Prepared By</span>
              <span>{dispatch.dispatched_by}</span>
            </div>
            <div>
              <div className="border-b border-slate-400 h-10 mb-1" />
              <span className="font-bold text-slate-800 block">Store Incharge</span>
              <span>Checked & Verified</span>
            </div>
            <div>
              <div className="border-b border-slate-400 h-10 mb-1" />
              <span className="font-bold text-slate-800 block">Driver Signature</span>
              <span>Goods Received in Good Condition</span>
            </div>
            <div>
              <div className="border-b border-slate-400 h-10 mb-1" />
              <span className="font-bold text-slate-800 block">Security Officer</span>
              <span>Vehicle Out Gate Verified</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print Gate Pass
          </button>
        </div>
      </div>
    </div>
  );
};
