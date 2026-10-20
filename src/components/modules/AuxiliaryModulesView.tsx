import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Wrench, AlertTriangle, Clock, Layers, UserCheck,
  CheckCircle, Plus, Hash, Cpu, RefreshCw
} from 'lucide-react';

export const AuxiliaryModulesView: React.FC = () => {
  const { showFlash } = useApp();

  const [activeTab, setActiveTab] = useState<'downtime' | 'yarn' | 'production' | 'faults' | 'operator' | 'sample'>('downtime');

  // Downtime Form
  const [downtimeList, setDowntimeList] = useState([
    { id: 1, machine: 'M-02', reason: 'Needle Breakage & Latch replacement', start: '2026-10-20 09:00', end: '2026-10-20 10:15' },
    { id: 2, machine: 'M-05', reason: 'Motor Overheat Check', start: '2026-10-19 14:00', end: '2026-10-19 14:45' }
  ]);
  const [dtMachine, setDtMachine] = useState('M-03');
  const [dtReason, setDtReason] = useState('');
  const [dtStart, setDtStart] = useState('09:00');
  const [dtEnd, setDtEnd] = useState('10:00');

  // Yarn Form
  const [yarnList, setYarnList] = useState([
    { id: 1, yarn: 'Cotton 30/1 Combed', qty: 250, machine: 'M-01', action: 'Issue' },
    { id: 2, yarn: 'Polyester 150D Texturized', qty: 100, machine: 'M-04', action: 'Issue' }
  ]);
  const [yName, setYName] = useState('Cotton 40/1 Ring Spun');
  const [yQty, setYQty] = useState('150');
  const [yMachine, setYMachine] = useState('M-02');
  const [yAction, setYAction] = useState('Issue');

  // Faults Form
  const [faultList, setFaultList] = useState([
    { id: 1, machine: 'M-01', code: 'E-104: Yarn Tension Sensor Anomaly' },
    { id: 2, machine: 'M-04', code: 'E-201: Oil Lubrication Pressure Low' }
  ]);
  const [fMachine, setFMachine] = useState('M-01');
  const [fCode, setFCode] = useState('E-108: Needle Detector Tripped');

  // Samples Form
  const [sampleList, setSampleList] = useState([
    { id: 1, sample: 'Heather Grey Fleece 280 GSM', status: 'Approved' },
    { id: 2, sample: 'Navy Single Jersey 180 GSM', status: 'Pending Review' }
  ]);
  const [sName, setSName] = useState('');
  const [sStatus, setSStatus] = useState('Pending');

  const handleAddDowntime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dtReason.trim()) return;
    setDowntimeList(prev => [
      { id: Date.now(), machine: dtMachine, reason: dtReason, start: dtStart, end: dtEnd },
      ...prev
    ]);
    setDtReason('');
    showFlash(`Machine ${dtMachine} downtime saved`, 'info');
  };

  const handleAddYarn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!yName.trim() || !yQty) return;
    setYarnList(prev => [
      { id: Date.now(), yarn: yName, qty: Number(yQty), machine: yMachine, action: yAction },
      ...prev
    ]);
    showFlash(`Yarn ${yAction} of ${yQty} KG logged`, 'success');
  };

  const handleAddFault = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fCode.trim()) return;
    setFaultList(prev => [{ id: Date.now(), machine: fMachine, code: fCode }, ...prev]);
    showFlash(`Fault code recorded for ${fMachine}`, 'warning');
  };

  const handleAddSample = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName.trim()) return;
    setSampleList(prev => [{ id: Date.now(), sample: sName, status: sStatus }, ...prev]);
    setSName('');
    showFlash('Sample approval record logged', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Auxiliary Mill Operations</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Secondary factory floor tracking modules defined in backend: Machine Downtime, Yarn Issuance, Shift Production, Machine Faults, Operator Logs, and Samples.
          </p>
        </div>

        {/* Sub-Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
          {[
            { id: 'downtime', label: 'Downtime (/downtime)' },
            { id: 'yarn', label: 'Yarn (/yarn)' },
            { id: 'faults', label: 'Faults (/faults)' },
            { id: 'sample', label: 'Samples (/sample)' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* DOWNTIME TAB */}
      {activeTab === 'downtime' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="font-bold text-sm text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Log Machine Downtime
            </h2>
            <form onSubmit={handleAddDowntime} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Machine No</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. M-01"
                  value={dtMachine}
                  onChange={e => setDtMachine(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Downtime Reason</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Broken needle replace, thread breakage, motor service"
                  value={dtReason}
                  onChange={e => setDtReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="text"
                    value={dtStart}
                    onChange={e => setDtStart(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
                  <input
                    type="text"
                    value={dtEnd}
                    onChange={e => setDtEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
              >
                Save Downtime
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="font-bold text-sm text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Downtime Event Log
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b">
                  <tr>
                    <th className="py-2 px-3">Machine</th>
                    <th className="py-2 px-3">Reason</th>
                    <th className="py-2 px-3">Period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {downtimeList.map(d => (
                    <tr key={d.id}>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{d.machine}</td>
                      <td className="py-2.5 px-3 text-slate-700">{d.reason}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{d.start} - {d.end}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* YARN TAB */}
      {activeTab === 'yarn' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="font-bold text-sm text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Record Yarn Issue / Return
            </h2>
            <form onSubmit={handleAddYarn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Yarn Count / Type</label>
                <input
                  type="text"
                  required
                  value={yName}
                  onChange={e => setYName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Qty (KG)</label>
                  <input
                    type="number"
                    required
                    value={yQty}
                    onChange={e => setYQty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Machine</label>
                  <input
                    type="text"
                    required
                    value={yMachine}
                    onChange={e => setYMachine(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Action</label>
                <select
                  value={yAction}
                  onChange={e => setYAction(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="Issue">Issue to Floor</option>
                  <option value="Return">Return to Store</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
              >
                Log Yarn
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="font-bold text-sm text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Yarn Allocation Ledger
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b">
                  <tr>
                    <th className="py-2 px-3">Yarn Description</th>
                    <th className="py-2 px-3">Weight (KG)</th>
                    <th className="py-2 px-3">Machine</th>
                    <th className="py-2 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {yarnList.map(y => (
                    <tr key={y.id}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{y.yarn}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">{y.qty} KG</td>
                      <td className="py-2.5 px-3 font-mono">{y.machine}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          y.action === 'Issue' ? 'bg-blue-100 text-blue-900' : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {y.action}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FAULTS TAB */}
      {activeTab === 'faults' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="font-bold text-sm text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Record Machine Fault Code
            </h2>
            <form onSubmit={handleAddFault} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Machine No</label>
                <input
                  type="text"
                  required
                  value={fMachine}
                  onChange={e => setFMachine(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fault Code & Description</label>
                <input
                  type="text"
                  required
                  value={fCode}
                  onChange={e => setFCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
              >
                Save Fault
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="font-bold text-sm text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Active Machine Faults
            </h2>
            <div className="space-y-2">
              {faultList.map(f => (
                <div key={f.id} className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <span className="font-bold text-rose-950 block">{f.machine}</span>
                      <span className="text-rose-800 font-mono text-[11px]">{f.code}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-900 font-bold uppercase text-[10px]">
                    Attention
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SAMPLES TAB */}
      {activeTab === 'sample' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="font-bold text-sm text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Log Fabric Sample
            </h2>
            <form onSubmit={handleAddSample} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sample Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100% Cotton Rib 2x2 Melange"
                  value={sName}
                  onChange={e => setSName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Approval Status</label>
                <select
                  value={sStatus}
                  onChange={e => setSStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="Pending">Pending Review</option>
                  <option value="Approved">Approved by Merchandiser</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
              >
                Log Sample
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="font-bold text-sm text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Quality & Merchandising Samples
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b">
                  <tr>
                    <th className="py-2 px-3">Sample Spec</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sampleList.map(s => (
                    <tr key={s.id}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{s.sample}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          s.status === 'Approved' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
