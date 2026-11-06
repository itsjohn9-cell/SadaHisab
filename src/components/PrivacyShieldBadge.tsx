import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Database, 
  CloudOff, 
  Lock, 
  X, 
  ExternalLink, 
  Radio, 
  CheckCircle2,
  Info
} from 'lucide-react';

export const PrivacyShieldBadge: React.FC = () => {
  const [showModal, setShowModal] = useState<boolean>(false);

  return (
    <>
      {/* Live Badge in Header */}
      <button
        onClick={() => setShowModal(true)}
        className="hidden md:flex items-center space-x-2 px-2.5 py-1 bg-slate-950 hover:bg-slate-900 border border-emerald-900/60 hover:border-emerald-700/80 rounded-lg text-[11px] font-mono text-slate-300 transition shadow-sm group"
        title="Click to view Zero-Trust Network & Storage Isolation Audit"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-emerald-400 font-semibold">Privacy Shield:</span>
        <span className="text-slate-300">100% Local DB</span>
        <span className="text-slate-600">&bull;</span>
        <span className="text-slate-400">Zero Cloud Sync</span>
        <span className="text-slate-600">&bull;</span>
        <span className="text-cyan-400">OTP Guard</span>
      </button>

      {/* Audit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Zero-Trust Privacy & Network Isolation Audit
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-emerald-300">
                  <Database className="h-4 w-4 text-emerald-400" />
                  <span>100% On-Device IndexedDB Storage</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  All personal bank balances, Khums audit snapshots, sponsorships, and decrypted records are stored strictly in client-side IndexedDB (<code className="text-emerald-400">Dexie.js</code>). Zero databases or backends exist.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-cyan-300">
                  <CloudOff className="h-4 w-4 text-cyan-400" />
                  <span>Network Isolation & Single Egress Audit</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  The application operates completely offline and air-gapped. The <strong>sole outbound HTTP call in the entire codebase</strong> is the optional, user-triggered exchange rate refresh from <code className="text-cyan-400">open.er-api.com</code>. No analytical scripts, third-party trackers, or telemetry beacons exist.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-purple-300">
                  <Lock className="h-4 w-4 text-purple-400" />
                  <span>Hard OTP Security Firewall</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  When parsing SMS or pasted notifications, messages matching OTP, PIN, or verification keywords are immediately scrubbed in-memory before entering the database.
                </p>
              </div>

            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
              >
                Close Audit
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

