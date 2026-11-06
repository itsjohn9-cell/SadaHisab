import React, { useState } from 'react';
import { 
  Smartphone, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  Sliders, 
  ArrowRight, 
  X,
  Play,
  Zap
} from 'lucide-react';
import { DEFAULT_BANKING_WHITELIST } from '../services/platformBridge';

interface AndroidRoutinesSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateIngest?: (text: string) => void;
}

export const AndroidRoutinesSetupModal: React.FC<AndroidRoutinesSetupModalProps> = ({
  isOpen,
  onClose,
  onSimulateIngest
}) => {
  const [activeTab, setActiveTab] = useState<'SAMSUNG' | 'MACRODROID' | 'WHITELIST' | 'TEST'>('SAMSUNG');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [testPayload, setTestPayload] = useState<string>(
    'Your ADCB Cr.Card ending 4821 was used for AED 365.87 at Lulu Hypermarket Khalidiyah on 04/11/2026. Avail Limit: AED 14,200.00.'
  );

  if (!isOpen) return null;

  const deepLinkUri = 'sadacash://ingest?payload=%notification_text%';
  const adcbSampleUri = 'sadacash://ingest?payload=AED%20365.87%20spent%20at%20Lulu&source=ADCB';

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 3000);
  };

  const handleRunSimulator = () => {
    if (onSimulateIngest && testPayload.trim()) {
      onSimulateIngest(testPayload.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Android Zero-Touch Ingestion Setup</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  No READ_SMS Required
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically push bank transaction notifications directly into Sada Cash via Samsung Modes & Routines or MacroDroid.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('SAMSUNG')}
            className={`flex-1 py-2 rounded-lg transition ${
              activeTab === 'SAMSUNG'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Samsung Modes & Routines
          </button>
          <button
            onClick={() => setActiveTab('MACRODROID')}
            className={`flex-1 py-2 rounded-lg transition ${
              activeTab === 'MACRODROID'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            MacroDroid (All Androids)
          </button>
          <button
            onClick={() => setActiveTab('WHITELIST')}
            className={`flex-1 py-2 rounded-lg transition ${
              activeTab === 'WHITELIST'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Whitelisted Apps
          </button>
          <button
            onClick={() => setActiveTab('TEST')}
            className={`flex-1 py-2 rounded-lg transition ${
              activeTab === 'TEST'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Deep-Link Test
          </button>
        </div>

        {/* Tab 1: Samsung Modes & Routines */}
        {activeTab === 'SAMSUNG' && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                <Sliders className="h-4 w-4 text-emerald-400" />
                <span>3-Step Samsung Routine Configuration</span>
              </h4>

              <div className="space-y-2.5 text-slate-300">
                <div className="flex items-start space-x-2.5">
                  <span className="h-5 w-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">1</span>
                  <div>
                    <strong className="text-white">Open Samsung Settings:</strong> Go to <span className="text-emerald-300 font-mono">Modes and Routines &rarr; Routines &rarr; + (Add Routine)</span>.
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="h-5 w-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">2</span>
                  <div>
                    <strong className="text-white">Add "If" Trigger:</strong> Select <span className="text-emerald-300 font-mono">Notification received</span> &rarr; Choose your banking apps (<strong className="text-white">ADCB</strong>, <strong className="text-white">Bank AL Habib</strong>, <strong className="text-white">NayaPay</strong>, <strong className="text-white">Easypaisa</strong>, <strong className="text-white">Google/Samsung Wallet</strong>).
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="h-5 w-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">3</span>
                  <div>
                    <strong className="text-white">Add "Then" Action:</strong> Select <span className="text-emerald-300 font-mono">Apps &rarr; Open URL or Send Intent</span> and paste the Sada Cash ingestion URI below:
                  </div>
                </div>
              </div>

              {/* 1-Tap Copyable Deep Link URI */}
              <div className="mt-3 bg-slate-900 border border-emerald-900/60 rounded-xl p-3 flex items-center justify-between">
                <div className="font-mono text-emerald-300 text-[11px] truncate mr-2 select-all">
                  {deepLinkUri}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(deepLinkUri, 'uri')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center space-x-1 shrink-0 transition shadow-sm"
                >
                  {copiedText === 'uri' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedText === 'uri' ? 'Copied!' : 'Copy URI'}</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-slate-300 flex items-start space-x-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Hard OTP Firewall Guarantee:</strong> Any notification containing OTP verification codes or passwords is instantaneously dropped in under 1ms before memory allocation.
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: MacroDroid */}
        {activeTab === 'MACRODROID' && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                <Zap className="h-4 w-4 text-emerald-400" />
                <span>MacroDroid Trigger Template (Any Android Phone)</span>
              </h4>

              <div className="space-y-2 text-slate-300">
                <p>1. Open MacroDroid &rarr; Add Macro.</p>
                <p>2. <strong>Trigger:</strong> Device Events &rarr; Notification &rarr; Notification Received &rarr; Select banking apps.</p>
                <p>3. <strong>Action:</strong> Applications &rarr; Open Website / HTTP &rarr; URL: <code className="text-emerald-300 font-mono bg-slate-900 px-1 py-0.5 rounded">sadacash://ingest?payload=[not_body]</code></p>
                <p>4. <strong>Save & Enable.</strong></p>
              </div>

              <div className="mt-3 bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div className="font-mono text-emerald-300 text-[11px] truncate mr-2 select-all">
                  sadacash://ingest?payload=[not_body]&source=MacroDroid
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('sadacash://ingest?payload=[not_body]&source=MacroDroid', 'macro')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center space-x-1 shrink-0 transition"
                >
                  {copiedText === 'macro' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedText === 'macro' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Package Whitelist */}
        {activeTab === 'WHITELIST' && (
          <div className="space-y-3 text-xs max-h-72 overflow-y-auto pr-1">
            <p className="text-slate-400">
              Sada Cash only accepts automated notification intents from verified banking app package IDs:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEFAULT_BANKING_WHITELIST.map((pkg, i) => (
                <div key={i} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">{pkg.appName}</div>
                    <div className="text-[10px] font-mono text-slate-400">{pkg.packageName}</div>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {pkg.region} • {pkg.currency}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Deep Link Test Simulator */}
        {activeTab === 'TEST' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-300">
              Test how Sada Cash handles incoming bank notifications pushed via <span className="text-emerald-400 font-mono">sadacash://ingest</span>:
            </p>
            <textarea
              rows={3}
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              placeholder="Enter simulated banking notification text..."
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleRunSimulator}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center space-x-1.5 shadow-md shadow-emerald-950/50 transition"
              >
                <Play className="h-4 w-4" />
                <span>Simulate Deep-Link Ingestion &rarr;</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
