import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  History, 
  Camera, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  Database
} from 'lucide-react';
import { platformBridge } from '../services/platformBridge';
import { TimeMachineSnapshot } from '../types';
import { formatDatePretty } from '../utils/formatters';

interface TimeMachineCardProps {
  onRestored: () => void;
}

export const TimeMachineCard: React.FC<TimeMachineCardProps> = ({ onRestored }) => {
  const [snapshots, setSnapshots] = useState<TimeMachineSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadSnapshots = async () => {
    setIsLoading(true);
    try {
      const list = await platformBridge.getTimeMachineSnapshots();
      setSnapshots(list);
    } catch (e) {
      console.warn('Failed to load Time Machine snapshots', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshots();
  }, []);

  const handleCaptureManual = async () => {
    const label = newLabel.trim() || `Manual Snapshot (${new Date().toLocaleTimeString()})`;
    try {
      await platformBridge.createTimeMachineSnapshot(label, 'MANUAL');
      setNewLabel('');
      setActionMessage(`Snapshot "${label}" captured successfully!`);
      setTimeout(() => setActionMessage(null), 3000);
      await loadSnapshots();
    } catch (err: any) {
      alert(`Capture failed: ${err.message}`);
    }
  };

  const handleRestore = async (snapshot: TimeMachineSnapshot) => {
    const confirmMsg = `Are you sure you want to restore to snapshot "${snapshot.label}" from ${new Date(snapshot.timestamp).toLocaleString()}?\n\nThis will restore ${snapshot.transactionsCount} transactions and ${snapshot.accountsCount} accounts.`;
    if (!confirm(confirmMsg)) return;

    try {
      const ok = await platformBridge.restoreTimeMachineSnapshot(snapshot.id);
      if (ok) {
        setActionMessage(`Restored ledger to "${snapshot.label}"!`);
        setTimeout(() => setActionMessage(null), 4000);
        onRestored();
        await loadSnapshots();
      } else {
        alert('Failed to restore snapshot. Please check console for details.');
      }
    } catch (err: any) {
      alert(`Restore error: ${err.message}`);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Delete snapshot "${label}"?`)) return;
    await platformBridge.deleteTimeMachineSnapshot(id);
    await loadSnapshots();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
              <span>Rolling 10-Snapshot Time Machine</span>
              <span className="px-1.5 py-0.2 text-[10px] font-mono bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/40">
                Auto-Redundancy
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Automatic pre-import, pre-roster, and manual state checkpoints with 1-click restore.
            </p>
          </div>
        </div>

        {/* Capture Snapshot Now */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Snapshot note (e.g. Before Dec Roster)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="button"
            onClick={handleCaptureManual}
            className="flex items-center space-x-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shrink-0 shadow-sm"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Capture</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-2.5 bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Snapshot List */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 text-xs">
        {snapshots.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            No Time Machine snapshots captured yet. Snapshots are created automatically before Excel imports and batch rosters.
          </div>
        ) : (
          snapshots.map((snap) => (
            <div
              key={snap.id}
              className="bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3 flex items-center justify-between transition"
            >
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                    snap.triggerType === 'EXCEL_IMPORT'
                      ? 'bg-purple-950 text-purple-300 border border-purple-800'
                      : snap.triggerType === 'ROSTER_BATCH'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  }`}>
                    {snap.triggerType}
                  </span>
                  <span className="font-semibold text-slate-200">{snap.label}</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-slate-500" />
                    <span>{new Date(snap.timestamp).toLocaleString()}</span>
                  </span>
                  <span>•</span>
                  <span>{snap.transactionsCount} txs</span>
                  <span>•</span>
                  <span>{snap.accountsCount} accounts</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleRestore(snap)}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-600/40 rounded-lg font-bold transition text-[11px]"
                  title="Undo all recent changes and rollback ledger to this point"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Restore</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(snap.id, snap.label)}
                  className="p-1 text-slate-500 hover:text-rose-400 transition"
                  title="Delete Snapshot"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
