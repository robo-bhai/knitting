import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Cpu, QrCode, Trash2, Search, CheckCircle2, AlertCircle, Hash, RefreshCw, PenLine } from 'lucide-react';

export const MachineSignView: React.FC = () => {
  const {
    workOrders, plans, bags, jobs, machineAssignments,
    assignMachine, deleteMachineAssignment
  } = useApp();

  // Form selections
  const [selectedWo, setSelectedWo] = useState<string>(workOrders[0]?.work_order || '');
  const [selectedShade, setSelectedShade] = useState<string>('');
  const [isCustomShade, setIsCustomShade] = useState<boolean>(false);
  const [customShade, setCustomShade] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<string>('1');
  const [needles, setNeedles] = useState<string>('24N');
  const [machineNo, setMachineNo] = useState<string>('M-01');
  const [unitNo, setUnitNo] = useState<number>(1);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Search filter for table
  const [searchWo, setSearchWo] = useState<string>('');

  // 1. Dynamic Shades available for selected Work Order (STRICTLY this WO's plans & bags)
  const currentWoObj = workOrders.find(w => w.work_order === selectedWo);
  const woPlanIds = currentWoObj 
    ? plans.filter(p => p.work_order_id === currentWoObj.id).map(p => p.id)
    : [];

  const shadesFromBags = bags
    .filter(b => woPlanIds.includes(b.plan_id))
    .map(b => b.shade)
    .filter(Boolean);

  const shadesFromJobs = jobs
    .filter(j => j.work_order_ref === selectedWo)
    .map(j => j.shade_ref)
    .filter(Boolean);

  const availableShades = Array.from(
    new Set([
      ...shadesFromBags,
      ...shadesFromJobs
    ])
  );

  // Auto-initialize selected shade when WO changes or on first load
  useEffect(() => {
    if (availableShades.length > 0) {
      if (!selectedShade || !availableShades.includes(selectedShade)) {
        const initial = availableShades[0];
        setSelectedShade(initial);
        updateJobAndNeedles(selectedWo, initial);
      }
    } else {
      setSelectedShade('');
    }
  }, [selectedWo, availableShades.length]);

  // Dynamic Jobs for selected WO & Shade
  const effectiveShade = isCustomShade ? customShade.trim() : selectedShade;
  const matchingJobs = jobs.filter(
    j => (!selectedWo || j.work_order_ref === selectedWo) &&
         (!effectiveShade || j.shade_ref.toLowerCase() === effectiveShade.toLowerCase())
  );

  const displayJobs = matchingJobs.length > 0 
    ? matchingJobs 
    : [{ id: 9999, job: 1, work_order_ref: selectedWo, shade_ref: effectiveShade || 'Standard', needles_ref: needles || '24N' }];

  const updateJobAndNeedles = (wo: string, shade: string) => {
    const foundJob = jobs.find(
      j => j.work_order_ref === wo && j.shade_ref.toLowerCase() === shade.toLowerCase()
    );
    if (foundJob) {
      setSelectedJob(foundJob.job.toString());
      setNeedles(foundJob.needles_ref || '24N');
    } else {
      setSelectedJob('1');
      if (!needles) setNeedles('24N');
    }
  };

  const handleWoChange = (wo: string) => {
    setSelectedWo(wo);
    const wObj = workOrders.find(w => w.work_order === wo);
    const pIds = wObj ? plans.filter(p => p.work_order_id === wObj.id).map(p => p.id) : [];
    const bShades = bags.filter(b => pIds.includes(b.plan_id)).map(b => b.shade).filter(Boolean);
    const jShades = jobs.filter(j => j.work_order_ref === wo).map(j => j.shade_ref).filter(Boolean);
    const newShades = Array.from(new Set([...bShades, ...jShades]));

    if (newShades.length > 0) {
      setSelectedShade(newShades[0]);
      setIsCustomShade(false);
      updateJobAndNeedles(wo, newShades[0]);
    } else {
      setSelectedShade('');
      setSelectedJob('1');
      setNeedles('24N');
    }
  };

  const handleShadeChange = (shade: string) => {
    setSelectedShade(shade);
    setIsCustomShade(false);
    updateJobAndNeedles(selectedWo, shade);
  };

  const handleCustomShadeChange = (shade: string) => {
    setCustomShade(shade);
    updateJobAndNeedles(selectedWo, shade);
  };

  const handleJobChange = (jobIdStr: string) => {
    setSelectedJob(jobIdStr);
    const j = displayJobs.find(job => job.job.toString() === jobIdStr);
    if (j && j.needles_ref) {
      setNeedles(j.needles_ref);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalShade = isCustomShade ? customShade.trim() : selectedShade;
    if (!selectedWo || !finalShade || !machineNo.trim()) return;

    const jId = selectedJob || '1';
    const jobFullText = `${jId}/${selectedWo}`;
    const code = assignMachine(jobFullText, needles || '24N', machineNo.trim().toUpperCase(), unitNo, finalShade, selectedWo);
    setGeneratedCode(code);
  };

  const filteredAssignments = searchWo.trim()
    ? machineAssignments.filter(m => m.job_full_text.toLowerCase().includes(searchWo.toLowerCase()) || m.machine_no.toLowerCase().includes(searchWo.toLowerCase()))
    : (selectedWo ? machineAssignments.filter(m => m.job_full_text.includes(selectedWo)) : machineAssignments);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Machine Sign-In & 5-Digit Unique Code Generator</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Assign knitting & weaving machines to a specific Job ID. Generates the 5-digit machine barcode scanned at Roll Entry.
          </p>
        </div>

        {generatedCode && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Generated Machine Barcode</span>
              <span className="text-xl font-black font-mono text-emerald-950 tracking-widest">{generatedCode}</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sign-In Form (machine_sign.html) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h2 className="font-bold text-sm text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-600" />
              Sign-In Machine to Job
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              Live Ready
            </span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Work Order */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Work Order <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={selectedWo}
                onChange={e => handleWoChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="">-- Choose Work Order --</option>
                {workOrders.map(wo => (
                  <option key={wo.id} value={wo.work_order}>
                    {wo.work_order}
                  </option>
                ))}
              </select>
            </div>

            {/* Shade Selection (Dynamic with custom option) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Select Fabric Shade <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomShade(!isCustomShade)}
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <PenLine className="w-3 h-3" />
                  {isCustomShade ? 'Select From List' : '+ Custom Shade'}
                </button>
              </div>

              {!isCustomShade ? (
                <select
                  required
                  value={selectedShade}
                  onChange={e => handleShadeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="">-- Choose Shade --</option>
                  {availableShades.map(shade => (
                    <option key={shade} value={shade}>
                      {shade}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="e.g. Olive Green, Bottle Green, Sky Blue..."
                  value={customShade}
                  onChange={e => handleCustomShadeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-400 bg-emerald-50/30 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              )}
            </div>

            {/* Job & Needles */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Job ID <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedJob}
                  onChange={e => handleJobChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  {displayJobs.map(j => (
                    <option key={j.id} value={j.job.toString()}>
                      Job #{j.job} {j.needles_ref ? `(${j.needles_ref})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Needles Spec</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 24N"
                  value={needles}
                  onChange={e => setNeedles(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Machine Number & Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Machine No <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. M-01, M-05"
                  value={machineNo}
                  onChange={e => setMachineNo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Knitting Unit</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="10"
                  value={unitNo}
                  onChange={e => setUnitNo(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Full Job Reference: <strong className="font-mono text-slate-900">{selectedJob ? `${selectedJob}/${selectedWo}` : 'Job#/WO'}</strong>
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-emerald-400" />
              Generate 5-Digit Machine Barcode
            </button>
          </form>
        </div>

        {/* Live Signed Machines Table (view_barcode.html & machine_sign.html table) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-3">
            <div>
              <h2 className="font-bold text-sm text-slate-900">Signed-In Machines & Barcodes</h2>
              <p className="text-xs text-slate-500">
                {selectedWo ? `Showing machines for ${selectedWo}` : 'Live active machine allocations across all units'}
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search Work Order / Machine..."
                value={searchWo}
                onChange={e => setSearchWo(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            {filteredAssignments.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active machine assignments found for this filter.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">5-Digit Code</th>
                    <th className="py-2 px-3">Machine & Unit</th>
                    <th className="py-2 px-3">Job Reference</th>
                    <th className="py-2 px-3">Needles</th>
                    <th className="py-2 px-3">Signed At</th>
                    <th className="py-2 px-3 text-right">Sign Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssignments.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 text-xs tracking-wider">
                          {m.unique_code}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900">{m.machine_no}</span>
                        <span className="text-slate-400 text-[11px] block font-mono">Unit {m.unit_no}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                        {m.job_full_text}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {m.needles}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] font-mono">
                        {m.created_at}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Sign out machine ${m.machine_no}?`)) deleteMachineAssignment(m.id);
                          }}
                          className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                          title="Sign Out / Delete"
                        >
                          Sign-Out
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
