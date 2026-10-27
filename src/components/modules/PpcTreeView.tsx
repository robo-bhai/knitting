import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FolderPlus, Plus, ChevronDown, ChevronRight, Edit3, Trash2,
  RefreshCw, CheckCircle, Hash, Info, Layers, Sparkles
} from 'lucide-react';
import {
  getNextWorkOrderNumber,
  getNextPlanId,
  getNextBagNumber,
  getNextLotName
} from '../../utils/ppcSequence';

export const PpcTreeView: React.FC = () => {
  const {
    workOrders, plans, bags, lots,
    addWorkOrder, editWorkOrder, deleteWorkOrder,
    addPlan, editPlan, deletePlan,
    addBag, editBag, deleteBag,
    addLot, editLot, deleteLot, updateLotQty
  } = useApp();

  // Collapsed / expanded states for Tree
  const [expandedWo, setExpandedWo] = useState<{ [id: number]: boolean }>({ 1: true, 2: true });
  const [expandedPlans, setExpandedPlans] = useState<{ [id: number]: boolean }>({ 1: true, 2: true, 3: true });

  const toggleWo = (id: number) => setExpandedWo(prev => ({ ...prev, [id]: !prev[id] }));
  const togglePlan = (id: number) => setExpandedPlans(prev => ({ ...prev, [id]: !prev[id] }));

  // Modal states
  const [woModal, setWoModal] = useState<{ open: boolean; editId?: number; name: string }>({ open: false, name: '' });
  const [planModal, setPlanModal] = useState<{ open: boolean; woId?: number; editId?: number; planId: string }>({ open: false, planId: '' });
  const [bagModal, setBagModal] = useState<{ open: boolean; planId?: number; editId?: number; bagNumber: string; shade: string }>({ open: false, bagNumber: '', shade: '' });
  const [lotModal, setLotModal] = useState<{
    open: boolean;
    bagId?: number;
    editId?: number;
    lot_name: string;
    fabric_length: string;
    fabric_weight: string;
    bag_weight: string;
    needles: string;
    remarks: string;
  }>({
    open: false,
    lot_name: '',
    fabric_length: '1000',
    fabric_weight: '400',
    bag_weight: '400',
    needles: '24N',
    remarks: ''
  });

  // Quick weight update modal
  const [quickQtyModal, setQuickQtyModal] = useState<{ open: boolean; lotId?: number; currentQty: number; newQty: string }>({
    open: false,
    currentQty: 0,
    newQty: ''
  });

  // Handlers
  const handleSaveWo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!woModal.name.trim()) return;
    if (woModal.editId) {
      editWorkOrder(woModal.editId, woModal.name);
    } else {
      addWorkOrder(woModal.name);
    }
    setWoModal({ open: false, name: '' });
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planModal.planId.trim()) return;
    if (planModal.editId) {
      editPlan(planModal.editId, planModal.planId);
    } else if (planModal.woId) {
      addPlan(planModal.woId, planModal.planId);
    }
    setPlanModal({ open: false, planId: '' });
  };

  const handleSaveBag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bagModal.bagNumber.trim() || !bagModal.shade.trim()) return;
    if (bagModal.editId) {
      editBag(bagModal.editId, bagModal.bagNumber, bagModal.shade);
    } else if (bagModal.planId) {
      addBag(bagModal.planId, bagModal.bagNumber, bagModal.shade);
    }
    setBagModal({ open: false, bagNumber: '', shade: '' });
  };

  const handleSaveLot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lotModal.lot_name.trim()) return;
    if (lotModal.editId) {
      editLot(lotModal.editId, {
        lot_name: lotModal.lot_name,
        fabric_length: Number(lotModal.fabric_length),
        fabric_weight: Number(lotModal.fabric_weight),
        bag_weight: Number(lotModal.bag_weight),
        needles: lotModal.needles,
        remarks: lotModal.remarks
      });
    } else if (lotModal.bagId) {
      addLot(lotModal.bagId, {
        lot_name: lotModal.lot_name,
        fabric_length: Number(lotModal.fabric_length),
        fabric_weight: Number(lotModal.fabric_weight),
        bag_weight: Number(lotModal.bag_weight),
        needles: lotModal.needles,
        remarks: lotModal.remarks
      });
    }
    setLotModal({
      open: false,
      lot_name: '',
      fabric_length: '1000',
      fabric_weight: '400',
      bag_weight: '400',
      needles: '24N',
      remarks: ''
    });
  };

  const handleUpdateLotQty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQtyModal.lotId || !quickQtyModal.newQty) return;
    updateLotQty(quickQtyModal.lotId, Number(quickQtyModal.newQty));
    setQuickQtyModal({ open: false, currentQty: 0, newQty: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Production Planning & Control (PPC Tree)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Hierarchy: Work Orders &rarr; Production Plans &rarr; Bags &rarr; Fabric Lots with live balance weight tracking.
          </p>
        </div>

        <button
          onClick={() => {
            const nextWo = getNextWorkOrderNumber(workOrders);
            setWoModal({ open: true, name: nextWo });
          }}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors self-start shadow-sm"
        >
          <FolderPlus className="w-4 h-4 text-emerald-400" />
          Add Work Order
        </button>
      </div>

      {/* Tree Container */}
      <div className="space-y-4">
        {workOrders.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400">
            <p className="text-sm font-medium">No Work Orders found.</p>
            <p className="text-xs mt-1">Click "Add Work Order" to start the production hierarchy.</p>
          </div>
        ) : (
          workOrders.map(wo => {
            const woPlans = plans.filter(p => p.work_order_id === wo.id);
            const isWoExpanded = expandedWo[wo.id] ?? true;

            return (
              <div key={wo.id} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Level 1: Work Order Header */}
                <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleWo(wo.id)}
                      className="text-slate-400 hover:text-white p-1 rounded"
                    >
                      {isWoExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                          Work Order
                        </span>
                        <span className="font-bold text-sm tracking-wide">{wo.work_order}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {woPlans.length} Production Plan(s) assigned
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        const nextPlan = getNextPlanId(plans);
                        setPlanModal({ open: true, woId: wo.id, planId: nextPlan });
                      }}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Add Plan under this Work Order"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Plan
                    </button>
                    <button
                      onClick={() => setWoModal({ open: true, editId: wo.id, name: wo.work_order })}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                      title="Edit Work Order"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete Work Order "${wo.work_order}"?`)) deleteWorkOrder(wo.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                      title="Delete Work Order"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Level 2: Plans Container */}
                {isWoExpanded && (
                  <div className="p-4 space-y-4 bg-slate-50/50">
                    {woPlans.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 bg-white rounded-lg border border-dashed border-slate-300">
                        No plans created under this Work Order yet. Click "+ Add Plan" above.
                      </div>
                    ) : (
                      woPlans.map(plan => {
                        const planBags = bags.filter(b => b.plan_id === plan.id);
                        const isPlanExpanded = expandedPlans[plan.id] ?? true;

                        return (
                          <div key={plan.id} className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                            {/* Plan Header */}
                            <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                              <div className="flex items-center gap-2.5">
                                <button
                                  onClick={() => togglePlan(plan.id)}
                                  className="text-slate-500 hover:text-slate-800 p-0.5 rounded"
                                >
                                  {isPlanExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                                      Plan
                                    </span>
                                    <span className="font-bold text-xs text-slate-900 font-mono">{plan.plan_id}</span>
                                    <span className="text-[11px] text-slate-500">
                                      ({planBags.length} Bags)
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    const nextBag = getNextBagNumber(bags);
                                    setBagModal({ open: true, planId: plan.id, bagNumber: nextBag, shade: '' });
                                  }}
                                  className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                                >
                                  <Plus className="w-3 h-3 text-emerald-600" />
                                  Add Bag
                                </button>
                                <button
                                  onClick={() => setPlanModal({ open: true, editId: plan.id, planId: plan.plan_id })}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                  title="Edit Plan"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Delete Plan "${plan.plan_id}"?`)) deletePlan(plan.id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                  title="Delete Plan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Level 3: Bags List */}
                            {isPlanExpanded && (
                              <div className="p-3 space-y-3">
                                {planBags.length === 0 ? (
                                  <div className="p-3 text-center text-xs text-slate-400">
                                    No bags in this plan. Click "Add Bag".
                                  </div>
                                ) : (
                                  planBags.map(bag => {
                                    const bagLots = lots.filter(l => l.bag_id === bag.id);
                                    const totalBagWeight = bagLots.reduce((sum, l) => sum + l.plan_weight, 0);
                                    const currentBalance = bagLots.reduce((sum, l) => sum + l.fabric_weight, 0);

                                    return (
                                      <div key={bag.id} className="border border-slate-200 rounded-lg bg-slate-50/40 p-3">
                                        {/* Bag Header */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-2 border-b border-slate-200 gap-2">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
                                              Bag
                                            </span>
                                            <span className="font-bold text-xs text-slate-900 font-mono">
                                              {bag.bag_number}
                                            </span>
                                            <span className="text-slate-400">&bull;</span>
                                            <span className="text-xs text-slate-700 font-medium">
                                              Shade: <span className="font-semibold text-slate-900">{bag.shade}</span>
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                              ({bag.created_at})
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-3">
                                            <div className="text-[11px] font-mono text-slate-600">
                                              <span>Plan: <strong>{totalBagWeight.toFixed(1)} KG</strong></span>
                                              <span className="mx-1 text-slate-300">|</span>
                                              <span className="text-emerald-700 font-semibold">Bal: {currentBalance.toFixed(1)} KG</span>
                                            </div>

                                            <div className="flex items-center gap-1">
                                              <button
                                                onClick={() => {
                                                  const nextLot = getNextLotName(lots, bag.id);
                                                  setLotModal({
                                                    open: true,
                                                    bagId: bag.id,
                                                    lot_name: nextLot,
                                                    fabric_length: '1000',
                                                    fabric_weight: '400',
                                                    bag_weight: totalBagWeight ? totalBagWeight.toString() : '400',
                                                    needles: '24N',
                                                    remarks: ''
                                                  });
                                                }}
                                                className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded text-xs font-medium flex items-center gap-1"
                                              >
                                                <Plus className="w-3 h-3" />
                                                Add Lot
                                              </button>
                                              <button
                                                onClick={() => setBagModal({ open: true, editId: bag.id, bagNumber: bag.bag_number, shade: bag.shade })}
                                                className="p-1 text-slate-400 hover:text-slate-700"
                                              >
                                                <Edit3 className="w-3 h-3" />
                                              </button>
                                              <button
                                                onClick={() => {
                                                  if (confirm(`Delete Bag "${bag.bag_number}"?`)) deleteBag(bag.id);
                                                }}
                                                className="p-1 text-slate-400 hover:text-rose-600"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Level 4: Lots Table */}
                                        {bagLots.length === 0 ? (
                                          <div className="text-center py-2 text-[11px] text-slate-400">
                                            No lots added to this bag yet. Click "+ Add Lot".
                                          </div>
                                        ) : (
                                          <div className="overflow-x-auto bg-white rounded border border-slate-200">
                                            <table className="w-full text-left text-xs">
                                              <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-semibold">
                                                <tr>
                                                  <th className="py-2 px-3">Lot Name</th>
                                                  <th className="py-2 px-3">Needles</th>
                                                  <th className="py-2 px-3">Job ID</th>
                                                  <th className="py-2 px-3">Plan Weight</th>
                                                  <th className="py-2 px-3">Live Balance</th>
                                                  <th className="py-2 px-3">Length (M)</th>
                                                  <th className="py-2 px-3">Remarks</th>
                                                  <th className="py-2 px-3 text-right">Actions</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100">
                                                {bagLots.map(lot => {
                                                  const isCompleted = lot.fabric_weight <= 0;
                                                  return (
                                                    <tr key={lot.id} className="hover:bg-slate-50">
                                                      <td className="py-2 px-3 font-bold text-slate-900 font-mono">
                                                        {lot.lot_name}
                                                      </td>
                                                      <td className="py-2 px-3">
                                                        <span className="font-mono text-[11px] font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                          {lot.needles}
                                                        </span>
                                                      </td>
                                                      <td className="py-2 px-3 font-mono text-slate-600">
                                                        Job #{lot.job_id}
                                                      </td>
                                                      <td className="py-2 px-3 font-mono font-semibold text-slate-800">
                                                        {lot.plan_weight.toFixed(1)} KG
                                                      </td>
                                                      <td className="py-2 px-3 font-mono">
                                                        <span className={`font-bold ${isCompleted ? 'text-slate-400' : 'text-emerald-700'}`}>
                                                          {lot.fabric_weight.toFixed(1)} KG
                                                        </span>
                                                        {isCompleted && (
                                                          <span className="ml-1 text-[10px] text-slate-400 uppercase font-sans">(Done)</span>
                                                        )}
                                                      </td>
                                                      <td className="py-2 px-3 font-mono text-slate-600">
                                                        {lot.fabric_length}m
                                                      </td>
                                                      <td className="py-2 px-3 text-slate-500 truncate max-w-xs">
                                                        {lot.remarks || '-'}
                                                      </td>
                                                      <td className="py-2 px-3 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                          {/* Quick Update Weight button corresponding to /ppc/lot/update-qty/<id> */}
                                                          <button
                                                            onClick={() => setQuickQtyModal({
                                                              open: true,
                                                              lotId: lot.id,
                                                              currentQty: lot.plan_weight,
                                                              newQty: lot.plan_weight.toString()
                                                            })}
                                                            className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                                                            title="Update Target Qty & Sync Bag Total (/ppc/lot/update-qty)"
                                                          >
                                                            <RefreshCw className="w-3 h-3" />
                                                          </button>
                                                          <button
                                                            onClick={() => setLotModal({
                                                              open: true,
                                                              editId: lot.id,
                                                              lot_name: lot.lot_name,
                                                              fabric_length: lot.fabric_length.toString(),
                                                              fabric_weight: lot.fabric_weight.toString(),
                                                              bag_weight: lot.bag_weight.toString(),
                                                              needles: lot.needles,
                                                              remarks: lot.remarks
                                                            })}
                                                            className="p-1 text-slate-400 hover:text-slate-700"
                                                            title="Edit Lot"
                                                          >
                                                            <Edit3 className="w-3 h-3" />
                                                          </button>
                                                          <button
                                                            onClick={() => {
                                                              if (confirm(`Delete Lot "${lot.lot_name}"?`)) deleteLot(lot.id);
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-rose-600"
                                                            title="Delete Lot"
                                                          >
                                                            <Trash2 className="w-3 h-3" />
                                                          </button>
                                                        </div>
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Work Order Add/Edit */}
      {woModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 mb-3">
              {woModal.editId ? 'Edit Work Order' : 'Add New Work Order'}
            </h3>
            <form onSubmit={handleSaveWo} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Work Order Number</label>
                  {!woModal.editId && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-medium border border-emerald-200 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-600" /> Auto 10000+
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10000"
                  value={woModal.name}
                  onChange={e => setWoModal({ ...woModal, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-400 mt-1">5-digit sequential number, starting at 10000.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWoModal({ open: false, name: '' })}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                >
                  Save Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Plan Add/Edit */}
      {planModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 mb-3">
              {planModal.editId ? 'Edit Production Plan' : 'Add Production Plan'}
            </h3>
            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Plan Identifier</label>
                  {!planModal.editId && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-medium border border-emerald-200 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-600" /> Auto 10000+
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10000"
                  value={planModal.planId}
                  onChange={e => setPlanModal({ ...planModal, planId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-400 mt-1">5-digit sequential plan identifier matching the series.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPlanModal({ open: false, planId: '' })}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Bag Add/Edit */}
      {bagModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 mb-3">
              {bagModal.editId ? 'Edit Bag' : 'Add New Bag'}
            </h3>
            <form onSubmit={handleSaveBag} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Bag Number</label>
                  {!bagModal.editId && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-medium border border-emerald-200 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-600" /> Auto 10000+
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10000"
                  value={bagModal.bagNumber}
                  onChange={e => setBagModal({ ...bagModal, bagNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fabric Shade / Color (Manual)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Navy Blue, Heather Grey, Royal Red"
                  value={bagModal.shade}
                  onChange={e => setBagModal({ ...bagModal, shade: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBagModal({ open: false, bagNumber: '', shade: '' })}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                >
                  Save Bag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Lot Add/Edit */}
      {lotModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 mb-4">
              {lotModal.editId ? 'Edit Fabric Lot' : 'Add New Lot to Bag'}
            </h3>
            <form onSubmit={handleSaveLot} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Lot Name</label>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 27-10-26 001A"
                    value={lotModal.lot_name}
                    onChange={e => setLotModal({ ...lotModal, lot_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-emerald-700 mt-0.5 inline-block font-mono">
                    Date + needle series (001A, 001B...)
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Needles Spec (Manual)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 24N or 28N"
                    value={lotModal.needles}
                    onChange={e => setLotModal({ ...lotModal, needles: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fabric Weight (KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="450.0"
                    value={lotModal.fabric_weight}
                    onChange={e => setLotModal({ ...lotModal, fabric_weight: e.target.value, bag_weight: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Length (Meters)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder="1200"
                    value={lotModal.fabric_length}
                    onChange={e => setLotModal({ ...lotModal, fabric_length: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Technical Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Single Jersey 30s Cotton Ring Spun"
                  value={lotModal.remarks}
                  onChange={e => setLotModal({ ...lotModal, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-500 flex items-start gap-1.5">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Unique Job ID will be automatically calculated based on Work Order, Shade, and Needles specification.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLotModal({ ...lotModal, open: false })}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                >
                  Save Lot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Quick Update Lot Target Qty (/ppc/lot/update-qty/<id>) */}
      {quickQtyModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 mb-2">Update Lot Target Weight</h3>
            <p className="text-xs text-slate-500 mb-3">
              Resets balance & stable target, and synchronizes total bag weight across all sibling lots.
            </p>
            <form onSubmit={handleUpdateLotQty} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Weight Target (KG)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={quickQtyModal.newQty}
                  onChange={e => setQuickQtyModal({ ...quickQtyModal, newQty: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickQtyModal({ open: false, currentQty: 0, newQty: '' })}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                >
                  Synchronize Weight
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
