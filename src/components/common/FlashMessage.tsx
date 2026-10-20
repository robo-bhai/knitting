import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, Info, AlertOctagon, X } from 'lucide-react';

export const FlashMessageContainer: React.FC = () => {
  const { flashMessages, dismissFlash } = useApp();

  if (flashMessages.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {flashMessages.map(msg => {
        let bg = 'bg-slate-900 text-white border-slate-700';
        let Icon = Info;
        if (msg.type === 'success') {
          bg = 'bg-emerald-900/95 text-emerald-100 border-emerald-700 shadow-emerald-950/20';
          Icon = CheckCircle2;
        } else if (msg.type === 'danger') {
          bg = 'bg-rose-900/95 text-rose-100 border-rose-700 shadow-rose-950/20';
          Icon = AlertOctagon;
        } else if (msg.type === 'warning') {
          bg = 'bg-amber-900/95 text-amber-100 border-amber-700 shadow-amber-950/20';
          Icon = AlertTriangle;
        }

        return (
          <div
            key={msg.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-lg border shadow-lg text-xs font-medium backdrop-blur-sm transition-all duration-300 animate-in slide-in-from-top-2 ${bg}`}
          >
            <div className="flex items-center gap-2.5">
              <Icon className="w-4 h-4 shrink-0" />
              <span>{msg.text}</span>
            </div>
            <button
              onClick={() => dismissFlash(msg.id)}
              className="p-1 hover:opacity-75 transition-opacity rounded ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
