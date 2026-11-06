import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  RefreshCw, 
  Check, 
  Copy, 
  Download, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles,
  Link2,
  Code2
} from 'lucide-react';
import { 
  getGoogleSheetConfig, 
  saveGoogleSheetConfig, 
  pullFromGoogleSheet, 
  getAppsScriptSnippet, 
  DEFAULT_SHEET_ID, 
  DEFAULT_SHEET_URL 
} from '../services/googleSheetSync';
import { exportToExcelWorkbook } from '../services/excelHealer';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => void;
  showToast: (msg: string) => void;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
  showToast
}) => {
  const [config, setConfig] = useState(getGoogleSheetConfig());
  const [webAppUrl, setWebAppUrl] = useState(config.appsScriptWebAppUrl || '');
  const [sheetId, setSheetId] = useState(config.sheetId || DEFAULT_SHEET_ID);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [activeTab, setActiveTab] = useState<'sync' | 'script' | 'schema'>('sync');

  useEffect(() => {
    setConfig(getGoogleSheetConfig());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveConfig = () => {
    const updated = saveGoogleSheetConfig({
      sheetId: sheetId.trim() || DEFAULT_SHEET_ID,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId.trim() || DEFAULT_SHEET_ID}/edit`,
      appsScriptWebAppUrl: webAppUrl.trim()
    });
    setConfig(updated);
    showToast('Google Sheet connection settings saved!');
  };

  const handlePullSync = async () => {
    setIsSyncing(true);
    handleSaveConfig();
    try {
      const result = await pullFromGoogleSheet('Expense');
      if (result.success) {
        showToast(result.message);
        onRefreshData();
      } else {
        alert(result.message);
      }
    } catch (e: any) {
      alert(`Sync failed: ${e.message}`);
    } finally {
      setIsSyncing(false);
      setConfig(getGoogleSheetConfig());
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(getAppsScriptSnippet());
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
    showToast('Google Apps Script copied to clipboard!');
  };

  const handleExportOrganizedExcel = async () => {
    try {
      const blob = await exportToExcelWorkbook();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SadaHisab-Organized-GoogleSheet-Template-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Downloaded organized multi-tab Excel workbook ready for Google Sheets!');
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-6 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Google Sheet Two-Way Live Sync
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Secure &bull; Encrypted
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Link historical ledger, sponsorships, and Khums calculations to your organized Google Sheet
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === 'sync'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔄 Live Sync Hub
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === 'script'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Apps Script Bridge
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === 'schema'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📑 Organized 5-Tab Schema
          </button>
        </div>

        {/* Tab 1: Live Sync */}
        {activeTab === 'sync' && (
          <div className="space-y-4">
            
            {/* Sheet Link Card */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-emerald-400" />
                  Connected Google Spreadsheet
                </span>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Open in Google Sheets</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-slate-400">Google Spreadsheet ID:</label>
                <input
                  type="text"
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  placeholder="e.g. 1UybhQ6dyrudvKTqgGF7yXy2Y8m6XILTNRJus5r-leUQ"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Apps Script Web App URL (Optional for 2-way real-time writing):</span>
                  <span className="text-emerald-400 font-mono text-[10px]">Private & Secure</span>
                </label>
                <input
                  type="text"
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {config.lastSyncTimestamp && (
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Last Sync: {new Date(config.lastSyncTimestamp).toLocaleString()}</span>
                  <span className="text-emerald-400 font-medium">{config.lastSyncMessage || 'Synced'}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handlePullSync}
                disabled={isSyncing}
                className="p-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-950/40 flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Pull Live from Google Sheet'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportOrganizedExcel}
                className="p-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center justify-center space-x-2 transition"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Export Organized 5-Tab Sheet</span>
              </button>
            </div>

            {/* Security Guarantee Note */}
            <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl flex items-start space-x-2 text-xs text-emerald-300">
              <ShieldCheck className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
              <span>
                <strong>100% Privacy & Anti-Duplicate Protected:</strong> Every pulled row passes through our 3-tier hash deduplication engine. Existing transactions and manual heals in your local database are never overwritten or duplicated.
              </span>
            </div>

          </div>
        )}

        {/* Tab 2: Apps Script Bridge */}
        {activeTab === 'script' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  2-Minute Google Apps Script Web App Bridge
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Paste this in your Google Sheet (<strong>Extensions &gt; Apps Script</strong>) to allow instant 2-way syncing without sharing the sheet publicly.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyScript}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? 'Copied!' : 'Copy Script'}</span>
              </button>
            </div>

            <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-56 leading-relaxed">
              {getAppsScriptSnippet()}
            </pre>

            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <li>Open your Google Sheet &rarr; Click <strong>Extensions &gt; Apps Script</strong>.</li>
              <li>Delete any template code, paste the script above, and click <strong>Save (Ctrl+S)</strong>.</li>
              <li>Click <strong>Deploy &gt; New deployment &gt; Select type &gt; Web app</strong>.</li>
              <li>Set <em>Execute as</em> to <strong>Me</strong> and <em>Who has access</em> to <strong>Anyone</strong>.</li>
              <li>Copy the generated Web App URL and paste it into the <em>Apps Script Web App URL</em> field in the Sync tab!</li>
            </ol>
          </div>
        )}

        {/* Tab 3: Organized 5-Tab Schema */}
        {activeTab === 'schema' && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Organized 5-Tab Structure for Your Google Sheet
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="font-bold text-emerald-400">1. Totals</span>
                <p className="text-[11px] text-slate-400">Account names, currencies (PKR, AED, USD), calculated ledger vs bank app balances & auto-adjustments.</p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="font-bold text-cyan-400">2. Expense</span>
                <p className="text-[11px] text-slate-400">Date, Multi-Month formulas (=4500*2), categories, payment channels, billing months & recipient notes.</p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="font-bold text-amber-400">3. Sponsorships</span>
                <p className="text-[11px] text-slate-400">Recurring charity, student stipends, coordinators, phone numbers (03xx) and monthly rosters.</p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="font-bold text-indigo-400">4. Loans (Qard-e-Hasana)</span>
                <p className="text-[11px] text-slate-400">Receivables, payables, doubtful debts, and Islamic liability purification deductions.</p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 sm:col-span-2">
                <span className="font-bold text-purple-400">5. Khums Purification</span>
                <p className="text-[11px] text-slate-400">Annual Nov 30th valuation snapshot, prior year capital deductions, surplus calculation & 20% Sahm distribution.</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSaveConfig}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
          >
            Save Settings
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
