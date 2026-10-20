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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
        {/* Banner */}
        <div className="bg-slate-900 p-6 text-white text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <Factory className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black uppercase tracking-tight">TEXFLOW INDUSTRIAL ERP</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manufacturing & Garment Management System
          </p>
        </div>

        {/* Form */}
        <div className="p-6">
          <h2 className="font-bold text-sm text-slate-900 mb-1">Sign In to Your Station</h2>
          <p className="text-xs text-slate-500 mb-4">Role-based authentication gateway (/login)</p>

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-800">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username / Station ID</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. c1234, i1234, m1234, admin"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Access Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-colors mt-2"
            >
              Sign In
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </button>
          </form>

          {/* Quick 1-Click Role Login Shortcuts from main.py */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 text-center">
              Quick Role Simulation (Credentials in main.py)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'admin')}
                className="p-2 border border-slate-200 hover:border-slate-400 rounded-lg text-left bg-slate-50 hover:bg-white transition-all"
              >
                <span className="font-bold text-slate-900 block">ADMIN</span>
                <span className="text-[10px] text-slate-500 font-mono">admin (Root)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('m1234', 'manager')}
                className="p-2 border border-slate-200 hover:border-slate-400 rounded-lg text-left bg-slate-50 hover:bg-white transition-all"
              >
                <span className="font-bold text-slate-900 block">MANAGER</span>
                <span className="text-[10px] text-slate-500 font-mono">m1234 / mp1234</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('i1234', 'incharge')}
                className="p-2 border border-slate-200 hover:border-slate-400 rounded-lg text-left bg-slate-50 hover:bg-white transition-all"
              >
                <span className="font-bold text-slate-900 block">INCHARGE</span>
                <span className="text-[10px] text-slate-500 font-mono">i1234 / ip1234</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('c1234', 'clerk')}
                className="p-2 border border-slate-200 hover:border-slate-400 rounded-lg text-left bg-slate-50 hover:bg-white transition-all"
              >
                <span className="font-bold text-slate-900 block">CLERK</span>
                <span className="text-[10px] text-slate-500 font-mono">c1234 / cp1234</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
