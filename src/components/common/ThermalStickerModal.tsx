import React from 'react';
import { RollSticker } from '../../types';
import { Printer, X, CheckCircle2 } from 'lucide-react';

interface Props {
  sticker: RollSticker | null;
  onClose: () => void;
}

export const ThermalStickerModal: React.FC<Props> = ({ sticker, onClose }) => {
  if (!sticker) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm tracking-wide">Roll Barcode Label Generated</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Label Section */}
        <div className="p-6 bg-slate-100 flex flex-col items-center">
          <div
            id="thermal-sticker-print"
            className="bg-white text-black p-4 w-72 rounded-lg border-2 border-black shadow-md font-mono text-xs select-none"
          >
            <div className="border-b-2 border-black pb-1.5 mb-2 text-center">
              <h2 className="text-sm font-black uppercase tracking-wider">TEXFLOW TEXTILES</h2>
              <p className="text-[10px] text-slate-700 uppercase">Fabric Roll Identification Tag</p>
            </div>

            {/* Simulated Barcode */}
            <div className="flex flex-col items-center my-2">
              <div className="h-10 w-full flex items-center justify-center gap-0.75 px-2 bg-white">
                {Array.from(sticker.roll_barcode).map((char, idx) => {
                  const val = parseInt(char, 10) || 5;
                  const w = (val % 3) + 1;
                  return (
                    <div
                      key={idx}
                      className="bg-black h-9"
                      style={{ width: `${w * 2.5}px`, marginRight: `${(idx % 2) + 1}px` }}
                    />
                  );
                })}
              </div>
              <span className="font-bold tracking-widest text-sm mt-0.5 font-mono">
                *{sticker.roll_barcode}*
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] pt-1 border-t border-black">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Bag No</span>
                <span className="font-bold">{sticker.bag}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Lot Name</span>
                <span className="font-bold">{sticker.lot}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Roll No</span>
                <span className="font-black text-sm">#{sticker.roll_no}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Machine / Unit</span>
                <span className="font-bold">{sticker.machine || 'M-01'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Needles</span>
                <span className="font-bold">{sticker.needle}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Shade</span>
                <span className="font-bold truncate block">{sticker.shade}</span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t-2 border-dashed border-black flex items-center justify-between bg-slate-50 p-2 rounded">
              <div>
                <span className="text-[10px] text-slate-600 block uppercase font-bold">
                  {sticker.qw ? 'Net Weight (QW)' : 'Produced (PW)'}
                </span>
                <span className="text-base font-black text-black">
                  {typeof sticker.weight === 'number' ? sticker.weight.toFixed(2) : sticker.weight} KG
                </span>
              </div>
              {sticker.qw && (
                <div className="text-right">
                  <span className="text-[9px] text-slate-500 block">PW: {sticker.pw} KG</span>
                  <span className="text-[9px] font-bold text-emerald-700 uppercase">Grade-A QC PASS</span>
                </div>
              )}
            </div>

            <div className="mt-2 text-[9px] text-slate-500 flex justify-between border-t border-slate-200 pt-1">
              <span>WO: {sticker.job_wo}</span>
              <span>{sticker.date}</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Sticker (3x2")
          </button>
        </div>
      </div>
    </div>
  );
};
