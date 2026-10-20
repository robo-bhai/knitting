import React from 'react';
import { FabricRoll, QualityCheck, Bag } from '../../types';
import { Printer, X, Receipt } from 'lucide-react';

interface Props {
  bagNumber: string | null;
  bags: Bag[];
  rolls: FabricRoll[];
  qualityChecks: QualityCheck[];
  onClose: () => void;
}

export const BagReceiptModal: React.FC<Props> = ({ bagNumber, bags, rolls, qualityChecks, onClose }) => {
  if (!bagNumber) return null;

  const bag = bags.find(b => b.bag_number === bagNumber);
  const bagRolls = rolls.filter(r => r.bag_number === bagNumber);

  // Group rolls by lot_name
  const rollsDict: { [lot: string]: { roll: FabricRoll; qw: number }[] } = {};
  let totalW = 0;
  let totalR = 0;

  for (const r of bagRolls) {
    const qc = qualityChecks.find(q => q.roll_id === r.roll_barcode);
    const weight = qc ? qc.grade_a_weight : r.weight;
    const lot = r.lot_name || 'UNASSIGNED';
    totalW += weight;
    totalR += 1;
    if (!rollsDict[lot]) rollsDict[lot] = [];
    rollsDict[lot].push({ roll: r, qw: weight });
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-sm">Bag Production Receipt</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div id="bag-receipt-print" className="p-6 font-mono text-xs bg-white text-slate-900">
          <div className="text-center border-b-2 border-black pb-3 mb-4">
            <h2 className="text-lg font-black uppercase tracking-tight">TEXFLOW INDUSTRIAL TEXTILE MILLS</h2>
            <p className="text-[10px] text-slate-600">BAG WEAVING & KNITTING PRODUCTION RECEIPT</p>
            <div className="mt-2 text-xs font-bold bg-slate-100 py-1 rounded inline-block px-4">
              BAG NUMBER: <span className="text-sm underline">{bagNumber}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] mb-4 pb-3 border-b border-dashed border-slate-400">
            <div>
              <span className="text-slate-500 block text-[9px] uppercase">Fabric Shade:</span>
              <span className="font-bold">{bag?.shade || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase">Created Date:</span>
              <span className="font-bold">{bag?.created_at || 'Recent'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase">Total Rolls Count:</span>
              <span className="font-bold text-sm">{totalR} Rolls</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase">Total Net Weight:</span>
              <span className="font-bold text-sm">{totalW.toFixed(2)} KG</span>
            </div>
          </div>

          <div className="space-y-4">
            {Object.keys(rollsDict).length === 0 ? (
              <p className="text-slate-500 text-center py-4">No rolls recorded in this bag.</p>
            ) : (
              Object.entries(rollsDict).map(([lot, items]) => {
                const subTotal = items.reduce((sum, item) => sum + item.qw, 0);
                return (
                  <div key={lot} className="border border-slate-300 rounded p-2">
                    <div className="flex justify-between font-bold border-b border-slate-300 pb-1 mb-2 text-xs">
                      <span>LOT: {lot} ({items.length} rolls)</span>
                      <span>Lot Weight: {subTotal.toFixed(2)} KG</span>
                    </div>
                    <table className="w-full text-left text-[10px]">
                      <thead>
                        <tr className="text-slate-600 border-b border-slate-200">
                          <th className="py-0.5">Roll #</th>
                          <th className="py-0.5">Barcode</th>
                          <th className="py-0.5">Needles</th>
                          <th className="py-0.5 text-right">Weight (KG)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(({ roll, qw }, idx) => (
                          <tr key={idx} className="border-b border-slate-100">
                            <td className="py-0.5">#{roll.roll_no}</td>
                            <td className="py-0.5">{roll.roll_barcode}</td>
                            <td className="py-0.5">{roll.needles}</td>
                            <td className="py-0.5 text-right font-bold">{qw.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-8 pt-4 border-t-2 border-black flex justify-between text-[10px] text-slate-600">
            <div>
              <p>Supervisor: ___________________</p>
            </div>
            <div>
              <p>Store Keeper: ___________________</p>
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
            Print Bag Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
