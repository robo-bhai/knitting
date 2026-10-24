import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Factory, Lock, User, ArrowRight, ShieldCheck, Key } from 'lucide-react';
import { UserRole } from '../../types';

interface Props {
  onSuccess: () => void;
}

export const LoginView: React.FC<Props> = ({ onSuccess }) => {
  const { login } = useApp();

  const [username, setUsername] = useState<string>('m1234');
  const [password, setPassword] = useState<string>('mp1234');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Please enter username');
      return;
    }

    const ok = login(username.trim());
    if (ok) {
      onSuccess();
    } else {
      setErrorMsg('Invalid credentials');
    }
  };

  const handleQuickLogin = (uname: string, role: UserRole) => {
    login(uname, role);
    onSuccess();
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 rounded-xl border-2 border-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_12px_rgba(0,0,0,0.15)] max-w-md w-full overflow-hidden">
        {/* Banner - Oracle ERP Silver Titlebar */}
        <div className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 p-5 text-white text-center border-b border-slate-600 shadow-md">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-blue-500/20 to-blue-700/30 border border-blue-400 text-blue-300 flex items-center justify-center mx-auto mb-2.5 shadow-inner">
            <Factory className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-black uppercase tracking-wider text-slate-100">TEXFLOW INDUSTRIAL ERP</h1>
          <p className="text-xs text-slate-300 mt-0.5 font-mono">
            Oracle Suite &bull; Garment &amp; Textile Execution
          </p>
        </div>

        {/* Form */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-3 border-b border-slate-300 pb-2">
            <h2 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Station Authentication</h2>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">
              ORCL-LOGIN
            </span>
          </div>

          {errorMsg && (
            <div className="mb-4 p-2.5 bg-rose-100 border border-rose-400 rounded text-xs text-rose-950 font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-800 mb-1">Username / Station ID</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. c1234, i1234, m1234, admin"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border-2 border-slate-400 rounded text-xs font-mono font-bold bg-white text-slate-900 shadow-inner focus:border-blue-700 focus:ring-1 focus:ring-blue-700 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-800 mb-1">Access Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border-2 border-slate-400 rounded text-xs font-mono bg-white text-slate-900 shadow-inner focus:border-blue-700 focus:ring-1 focus:ring-blue-700 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-gradient-to-b from-blue-700 via-blue-800 to-blue-900 hover:from-blue-600 hover:to-blue-800 text-white rounded text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all border border-blue-950 mt-2 cursor-pointer active:shadow-inner"
            >
              Sign In to Station
              <ArrowRight className="w-4 h-4 text-emerald-300" />
            </button>
          </form>

          {/* Quick 1-Click Role Login Shortcuts */}
          <div className="mt-5 pt-4 border-t border-slate-300">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-2 text-center">
              Quick Role Simulation (Local Credentials)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'admin')}
                className="p-2 border border-slate-400 hover:border-blue-700 rounded text-left bg-gradient-to-b from-slate-100 to-slate-200 hover:from-white hover:to-slate-100 transition-all shadow-2xs cursor-pointer"
              >
                <span className="font-bold text-slate-900 block text-xs">ADMIN</span>
                <span className="text-[10px] text-slate-600 font-mono">admin (Root)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('m1234', 'manager')}
                className="p-2 border border-slate-400 hover:border-blue-700 rounded text-left bg-gradient-to-b from-slate-100 to-slate-200 hover:from-white hover:to-slate-100 transition-all shadow-2xs cursor-pointer"
              >
                <span className="font-bold text-slate-900 block text-xs">MANAGER</span>
                <span className="text-[10px] text-slate-600 font-mono">m1234 / mp1234</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('i1234', 'incharge')}
                className="p-2 border border-slate-400 hover:border-blue-700 rounded text-left bg-gradient-to-b from-slate-100 to-slate-200 hover:from-white hover:to-slate-100 transition-all shadow-2xs cursor-pointer"
              >
                <span className="font-bold text-slate-900 block text-xs">INCHARGE</span>
                <span className="text-[10px] text-slate-600 font-mono">i1234 / ip1234</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('c1234', 'clerk')}
                className="p-2 border border-slate-400 hover:border-blue-700 rounded text-left bg-gradient-to-b from-slate-100 to-slate-200 hover:from-white hover:to-slate-100 transition-all shadow-2xs cursor-pointer"
              >
                <span className="font-bold text-slate-900 block text-xs">CLERK</span>
                <span className="text-[10px] text-slate-600 font-mono">c1234 / cp1234</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
