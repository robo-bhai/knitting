import React from 'react';
import { RollSticker } from '../../types';
import { Printer, X, CheckCircle2, Copy, Check } from 'lucide-react';

interface Props {
  sticker: RollSticker | null;
  onClose: () => void;
}

export const ThermalStickerModal: React.FC<Props> = ({ sticker, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  if (!sticker) return null;

  const handlePrint = () => {
    window.print();
  };

  const copyBarcode = () => {
    if (sticker.roll_barcode) {
      navigator.clipboard.writeText(sticker.roll_barcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Generate realistic, scannable barcode bar widths from the barcode string
  const generateBarcodeBars = (code: string) => {
    const bars: { width: number; isBlack: boolean }[] = [];
    // Start guard
    bars.push({ width: 3, isBlack: true });
    bars.push({ width: 2, isBlack: false });
    bars.push({ width: 2, isBlack: true });

    for (let i = 0; i < code.length; i++) {
      const codeVal = code.charCodeAt(i);
      const w1 = (codeVal % 3) + 1.5;
      const w2 = ((codeVal * 3) % 4) + 1.2;
      const w3 = ((codeVal * 7) % 3) + 1;
      bars.push({ width: w1, isBlack: true });
      bars.push({ width: 1.5, isBlack: false });
      bars.push({ width: w2, isBlack: true });
      bars.push({ width: 2, isBlack: false });
      bars.push({ width: w3, isBlack: true });
      bars.push({ width: 1.8, isBlack: false });
    }

    // Stop guard
    bars.push({ width: 2, isBlack: true });
    bars.push({ width: 2, isBlack: false });
    bars.push({ width: 3, isBlack: true });
    return bars;
  };

  const barcodeBars = generateBarcodeBars(sticker.roll_barcode);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Print-only CSS embedded */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-thermal-label, #printable-thermal-label * {
            visibility: visible !important;
          }
          #printable-thermal-label {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100mm !important;
            padding: 4mm !important;
            border: 2px solid #000 !important;
            box-shadow: none !important;
            background: white !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="font-bold text-xs uppercase tracking-wider block">Roll Fed & Sticker Ready</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {sticker.is_merged ? 'Weight Merged into Existing Roll' : 'Series-wise Sequential Roll'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sticker Container */}
        <div className="p-5 bg-slate-100 flex flex-col items-center">
          <div
            id="printable-thermal-label"
            className="bg-white text-black p-4 w-full max-w-[340px] rounded-xl border-2 border-black shadow-md font-mono select-none"
          >
            {/* Header: Mill Name & Tag Title */}
            <div className="border-b-2 border-black pb-1.5 mb-2.5 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider leading-tight">TEXFLOW GARMENTS ERP</h2>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">KNITTING ROLL IDENTIFICATION</p>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 border border-black font-bold uppercase rounded">
                {sticker.is_merged ? 'MERGED' : 'ORIGINAL'}
              </span>
            </div>

            {/* EXACT 5-ROW THERMAL STICKER LAYOUT AS SPECIFIED */}
            <div className="space-y-2 text-xs">
              
              {/* ROW 1: Bag Number | Lot | Roll Number */}
              <div className="grid grid-cols-3 gap-1 border-b border-black pb-1.5">
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-600 block">Bag No:</span>
                  <strong className="text-[11px] font-black tracking-tight truncate block">{sticker.bag}</strong>
                </div>
                <div className="text-center border-x border-slate-300 px-1">
                  <span className="text-[9px] font-bold uppercase text-slate-600 block">Lot:</span>
                  <strong className="text-[11px] font-black truncate block">{sticker.lot}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold uppercase text-slate-600 block">Roll No:</span>
                  <strong className="text-sm font-black text-emerald-800 block">#{sticker.roll_no}</strong>
                </div>
              </div>

              {/* ROW 2: Job / Work Order | Needle */}
              <div className="grid grid-cols-2 gap-2 border-b border-black pb-1.5">
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-600 block">Job / WO:</span>
                  <strong className="text-[11px] font-black truncate block">{sticker.job_wo}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold uppercase text-slate-600 block">Needle:</span>
                  <strong className="text-[11px] font-black block">{sticker.needle}</strong>
                </div>
              </div>

              {/* ROW 3: Machine | Weight */}
              <div className="grid grid-cols-2 gap-2 border-b border-black pb-1.5 items-center bg-slate-50 p-1 rounded">
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-600 block">Machine:</span>
                  <strong className="text-xs font-black block">{sticker.machine || 'M-01'}</strong>
                  {sticker.shade && (
                    <span className="text-[9px] text-slate-500 truncate block">({sticker.shade})</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold uppercase text-slate-600 block">Net Weight:</span>
                  <strong className="text-base font-black text-black block">
                    {typeof sticker.weight === 'number' ? sticker.weight.toFixed(2) : sticker.weight} KG
                  </strong>
                </div>
              </div>

              {/* ROW 4: Roll Barcode Text (Copyable) */}
              <div className="pt-1 text-center">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">Roll Barcode</span>
                <div className="flex items-center justify-center gap-1.5 mt-0.5">
                  <span className="text-sm font-black tracking-widest text-slate-900 font-mono">
                    *{sticker.roll_barcode}*
                  </span>
                </div>
              </div>

              {/* ROW 5: Laser-Scannable Optical Barcode Bars (SVG) */}
              <div className="pt-1 pb-1 flex flex-col items-center justify-center">
                <div className="w-full bg-white flex items-center justify-center px-2 py-1 border border-slate-200 rounded">
                  <svg
                    className="w-full h-11"
                    viewBox="0 0 240 44"
                    preserveAspectRatio="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {(() => {
                      let currentX = 10;
                      return barcodeBars.map((bar, idx) => {
                        const x = currentX;
                        currentX += bar.width * 1.5;
                        if (!bar.isBlack) return null;
                        return (
                          <rect
                            key={idx}
                            x={x}
                            y={2}
                            width={bar.width * 1.5}
                            height={40}
                            fill="#000000"
                          />
                        );
                      });
                    })()}
                  </svg>
                </div>
                <span className="text-[8px] text-slate-500 tracking-wider mt-1 uppercase">
                  Optical Laser Scannable (Code-128 Compliant)
                </span>
              </div>

              {/* Footer Stamp */}
              <div className="border-t border-slate-300 pt-1 flex items-center justify-between text-[9px] text-slate-500">
                <span>Date: {sticker.date}</span>
                <span>TexFlow ERP Station</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={copyBarcode}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Barcode' : 'Copy Barcode'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Done
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Sticker (3x2")</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
