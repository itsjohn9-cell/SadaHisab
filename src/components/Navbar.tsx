import React from 'react';
import { 
  Wallet, 
  BookOpen, 
  ShieldCheck, 
  Scale, 
  HeartHandshake, 
  ArrowLeftRight, 
  RefreshCw, 
  Sparkles, 
  Trash2, 
  PlusCircle,
  Inbox,
  CalendarCheck2,
  ClipboardPaste,
  Wrench,
  Lock
} from 'lucide-react';
import { PrivacyShieldBadge } from './PrivacyShieldBadge';

export type NavTabType = 
  | 'dashboard' 
  | 'ledger' 
  | 'magic-inbox' 
  | 'roster' 
  | 'reconcile'
  | 'healer' 
  | 'khums' 
  | 'sponsorships' 
  | 'import-export';

interface NavbarProps {
  activeTab: NavTabType;
  setActiveTab: (tab: NavTabType) => void;
  needsReviewCount: number;
  sampleDataCount: number;
  onLoadSample: () => void;
  onClearSample: () => void;
  onSyncFX: () => void;
  isSyncingFX: boolean;
  onOpenAddModal: () => void;
  onOpenQuickPaste: () => void;
  onOpenSecurityModal: () => void;
  primaryCurrency: 'PKR' | 'AED';
  setPrimaryCurrency: (c: 'PKR' | 'AED') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  needsReviewCount,
  sampleDataCount,
  onLoadSample,
  onClearSample,
  onSyncFX,
  isSyncingFX,
  onOpenAddModal,
  onOpenQuickPaste,
  onOpenSecurityModal,
  primaryCurrency,
  setPrimaryCurrency
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Scale className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">Sada Hisab</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Zero-Trust
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Automated Cash & Khums Suite</p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden xl:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Wallet className="h-4 w-4" />
              <span>Dashboard</span>
            </button>

            {/* Magic Inbox */}
            <button
              onClick={() => setActiveTab('magic-inbox')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'magic-inbox'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Inbox className="h-4 w-4 text-emerald-400" />
              <span>Magic Inbox</span>
            </button>

            {/* Monthly Roster */}
            <button
              onClick={() => setActiveTab('roster')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'roster'
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CalendarCheck2 className="h-4 w-4 text-cyan-400" />
              <span>Roster</span>
            </button>

            {/* Reconcile & Audit */}
            <button
              onClick={() => setActiveTab('reconcile')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'reconcile'
                  ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Wrench className="h-4 w-4 text-amber-400" />
              <span>Reconcile</span>
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'ledger'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Ledger</span>
            </button>

            <button
              onClick={() => setActiveTab('healer')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors relative ${
                activeTab === 'healer'
                  ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Healer</span>
              {needsReviewCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {needsReviewCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('khums')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'khums'
                  ? 'bg-slate-800 text-purple-400 border border-slate-700 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Scale className="h-4 w-4" />
              <span>Khums</span>
            </button>

            <button
              onClick={() => setActiveTab('import-export')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'import-export'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>Vault</span>
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            
            {/* Live Privacy Shield Badge */}
            <PrivacyShieldBadge />

            {/* App Lock & Security Settings Trigger */}
            <button
              onClick={onOpenSecurityModal}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700 rounded-lg text-xs font-semibold transition"
              title="App Lock & Security Settings (PIN / Biometrics)"
            >
              <Lock className="h-4 w-4" />
            </button>

            {/* Quick Paste Floating Trigger */}
            <button
              onClick={onOpenQuickPaste}
              className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-lg text-xs font-semibold transition"
              title="Quick Paste SMS / Receipt (Ctrl+V)"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Paste SMS</span>
              <kbd className="hidden lg:inline-block ml-1 px-1 py-0.2 text-[9px] font-mono bg-slate-900 border border-slate-700 rounded text-slate-400">Ctrl+V</kbd>
            </button>

            {/* Currency Toggle (PKR / AED) */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setPrimaryCurrency('PKR')}
                className={`px-2 py-1 rounded transition-colors ${
                  primaryCurrency === 'PKR' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="View Net Worth in Pakistani Rupees"
              >
                PKR
              </button>
              <button
                onClick={() => setPrimaryCurrency('AED')}
                className={`px-2 py-1 rounded transition-colors ${
                  primaryCurrency === 'AED' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="View Net Worth in UAE Dirhams"
              >
                AED
              </button>
            </div>

            {/* Demo Sandbox Mode Buttons */}
            {sampleDataCount > 0 ? (
              <button
                onClick={onClearSample}
                className="flex items-center space-x-1 px-2 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-lg text-xs font-medium transition shadow-sm"
                title="Remove sample transactions"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Clear</span>
              </button>
            ) : (
              <button
                onClick={onLoadSample}
                className="flex items-center space-x-1 px-2 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/80 rounded-lg text-xs font-medium transition shadow-sm"
                title="Load sample data"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span className="hidden lg:inline">Sample</span>
              </button>
            )}

            {/* Quick Add Transaction Button */}
            <button
              onClick={onOpenAddModal}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-md transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Record</span>
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Sub-Navigation Bar */}
        <div className="flex xl:hidden overflow-x-auto py-2 space-x-1 border-t border-slate-800/60 no-scrollbar text-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1 rounded-md whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('magic-inbox')}
            className={`px-3 py-1 rounded-md whitespace-nowrap flex items-center space-x-1 ${activeTab === 'magic-inbox' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'}`}
          >
            <Sparkles className="h-3 w-3" />
            <span>Magic Inbox</span>
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-3 py-1 rounded-md whitespace-nowrap flex items-center space-x-1 ${activeTab === 'roster' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400'}`}
          >
            <CalendarCheck2 className="h-3 w-3" />
            <span>Roster</span>
          </button>
          <button
            onClick={() => setActiveTab('reconcile')}
            className={`px-3 py-1 rounded-md whitespace-nowrap flex items-center space-x-1 ${activeTab === 'reconcile' ? 'bg-slate-800 text-amber-400' : 'text-slate-400'}`}
          >
            <Wrench className="h-3 w-3" />
            <span>Reconcile</span>
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1 rounded-md whitespace-nowrap ${activeTab === 'ledger' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'}`}
          >
            Ledger
          </button>
          <button
            onClick={() => setActiveTab('healer')}
            className={`px-3 py-1 rounded-md whitespace-nowrap ${activeTab === 'healer' ? 'bg-slate-800 text-amber-400' : 'text-slate-400'}`}
          >
            Healer ({needsReviewCount})
          </button>
          <button
            onClick={() => setActiveTab('khums')}
            className={`px-3 py-1 rounded-md whitespace-nowrap ${activeTab === 'khums' ? 'bg-slate-800 text-purple-400' : 'text-slate-400'}`}
          >
            Khums
          </button>
          <button
            onClick={() => setActiveTab('import-export')}
            className={`px-3 py-1 rounded-md whitespace-nowrap ${activeTab === 'import-export' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'}`}
          >
            Vault
          </button>
        </div>
      </div>
    </header>
  );
};
