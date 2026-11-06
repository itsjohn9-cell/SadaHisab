import React, { useState } from 'react';
import { 
  Smartphone, 
  X, 
  Copy, 
  Check, 
  ShieldCheck, 
  ExternalLink, 
  Zap, 
  Terminal,
  Cpu
} from 'lucide-react';

interface AndroidBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidBridgeModal: React.FC<AndroidBridgeModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const sampleUrlScheme = `${window.location.origin}/?quickAdd=Dear+Customer,+PKR+12,525+debited+from+Al+Habib+to+Green+Island+School`;

  const macrodroidJson = JSON.stringify({
    name: "Sada Hisab Bank SMS Forwarder",
    trigger: {
      type: "Notification Received",
      apps: ["Messages", "ADCB", "Bank AL Habib", "NayaPay", "Easypaisa", "JazzCash"],
      filter: "Exclude OTP / verification / PIN"
    },
    action: {
      type: "Open Website / HTTP Shortcut",
      url: `${window.location.origin}/?quickAdd=[notification_text]`
    }
  }, null, 2);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Android Automation Bridge (MacroDroid / Tasker / Samsung)
              </h3>
              <p className="text-xs text-slate-400">
                1-tap forward bank transaction SMS & notifications into your local Sada Hisab inbox
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-emerald-200">
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-emerald-300">Hard OTP Security Firewall Guaranteed:</span>
            <p className="text-emerald-200/80 mt-0.5">
              Even if your automation accidentally forwards a message containing a one-time password or security PIN, Sada Hisab's built-in firewall immediately purges it from memory without writing it to disk.
            </p>
          </div>
        </div>

        {/* Option 1: URL Scheme QuickAdd */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>1. Local URL Scheme Handler</span>
          </h4>
          <p className="text-xs text-slate-400">
            Pass any encoded notification text via the <code className="text-emerald-400 font-mono">?quickAdd=...</code> parameter. When clicked or triggered on Android, Sada Hisab automatically opens the Magic Inbox with the parsed card ready for 1-click ledger approval!
          </p>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <code className="text-[11px] font-mono text-slate-300 truncate max-w-md">
              {sampleUrlScheme}
            </code>
            <button
              onClick={() => copyToClipboard(sampleUrlScheme, 'url')}
              className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold shrink-0 ml-2"
            >
              {copiedSection === 'url' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedSection === 'url' ? 'Copied' : 'Copy URL'}</span>
            </button>
          </div>
        </div>

        {/* Option 2: MacroDroid / Tasker / Samsung Routines */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            <span>2. Setup in MacroDroid or Samsung Modes & Routines</span>
          </h4>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 space-y-2.5">
            <div className="flex items-start space-x-2">
              <span className="font-bold text-emerald-400 font-mono">Step 1:</span>
              <span>Install <strong>MacroDroid</strong> or open <strong>Modes and Routines</strong> on Samsung Galaxy.</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-bold text-emerald-400 font-mono">Step 2:</span>
              <span>Create Trigger: <strong>Notification Received</strong> &rarr; Select your banking apps (ADCB, Bank AL Habib, NayaPay, Easypaisa, JazzCash).</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-bold text-emerald-400 font-mono">Step 3:</span>
              <span>Set Action: <strong>Open Website / URL</strong> &rarr; Enter <code className="text-cyan-300 font-mono">{window.location.origin}/?quickAdd=[notification_text]</code></span>
            </div>
          </div>

          {/* MacroDroid Export Block */}
          <div className="relative">
            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-400 overflow-x-auto max-h-36">
              {macrodroidJson}
            </pre>
            <button
              onClick={() => copyToClipboard(macrodroidJson, 'json')}
              className="absolute top-2 right-2 flex items-center space-x-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs"
            >
              {copiedSection === 'json' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copiedSection === 'json' ? 'Copied' : 'Copy Template'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
          >
            Got It
          </button>
        </div>

      </div>
    </div>
  );
};

