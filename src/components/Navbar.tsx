import React from 'react';
import { 
  Wallet, 
  BookOpen, 
  ShieldCheck, 
  Scale, 
  ArrowLeftRight, 
  Sparkles, 
  Trash2, 
  PlusCircle,
  Inbox,
  CalendarCheck2,
  ClipboardPaste,
  Wrench,
  Lock,
  ScanLine,
  Mic,
  Calendar,
  FileText,
  HandCoins,
  Users,
  Coins,
  Eye,
  EyeOff,
  Sliders
} from 'lucide-react';
import { PrivacyShieldBadge } from './PrivacyShieldBadge';
import { FXValuationMode } from '../types';

export type NavTabType = 
  | 'dashboard' 
  | 'ledger' 
  | 'magic-inbox' 
  | 'roster' 
  | 'coordinators'
  | 'reminders'
  | 'reports'
  | 'loans'
  | 'reconcile'
  | 'healer' 
  | 'khums' 
  | 'sponsorships' 
  | 'import-export'
  | 'studio';

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
  onOpenBillScanner: () => void;
  onOpenVoiceLogger: () => void;
  onOpenSecurityModal: () => void;
  onOpenGoogleSheetModal?: () => void;
  primaryCurrency: 'PKR' | 'AED' | 'USD';
  setPrimaryCurrency: (c: 'PKR' | 'AED' | 'USD') => void;
  fxValuationMode: FXValuationMode;
  setFxValuationMode: (m: FXValuationMode) => void;
  isPrivacyMasked?: boolean;
  onTogglePrivacyMask?: () => void;
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
  onOpenBillScanner,
  onOpenVoiceLogger,
  onOpenSecurityModal,
  onOpenGoogleSheetModal,
  primaryCurrency,
  setPrimaryCurrency,
  fxValuationMode,
  setFxValuationMode,
  isPrivacyMasked = false,
  onTogglePrivacyMask
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer shrink-0" onClick={() => setActiveTab('dashboard')}>
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Scale className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-bold text-base sm:text-lg text-white tracking-tight">Sada Cash</span>
                <span className="text-[10px] px-1.5 py-0.2 sm:py-0.5 rounded font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  سادہ حساب
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Cross-Border Wealth & Khums Suite</p>
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
              <span>Inbox</span>
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

            {/* Coordinator Groups */}
            <button
              onClick={() => setActiveTab('coordinators')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'coordinators'
                  ? 'bg-slate-800 text-teal-400 border border-slate-700 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="h-4 w-4 text-teal-400" />
              <span>Coordinators</span>
            </button>

            {/* Planned Reminders */}
            <button
              onClick={() => setActiveTab('reminders')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'reminders'
                  ? 'bg-slate-800 text-teal-400 border border-slate-700 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="h-4 w-4 text-teal-400" />
              <span>Schedules</span>
            </button>

            {/* Reports & Charity % */}
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'reports'
                  ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileText className="h-4 w-4 text-amber-400" />
              <span>Reports</span>
            </button>

            {/* Loans & Fiqh Checklist */}
            <button
              onClick={() => setActiveTab('loans')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'loans'
                  ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <HandCoins className="h-4 w-4 text-indigo-400" />
              <span>Loans & Fiqh</span>
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

            <button
              onClick={() => setActiveTab('studio')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'studio'
                  ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="h-4 w-4 text-indigo-400" />
              <span>Studio</span>
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            
            {/* Shoulder-Surfing Privacy Mask Toggle (Ctrl+B) */}
            <button
              type="button"
              onClick={onTogglePrivacyMask}
              className={`p-1.5 rounded-xl border transition ${
                isPrivacyMasked
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={isPrivacyMasked ? "Privacy Mask Active: Balances Hidden (Ctrl+B)" : "Toggle Privacy Mask (Ctrl+B)"}
            >
              {isPrivacyMasked ? <EyeOff className="h-4 w-4 text-amber-400" /> : <Eye className="h-4 w-4" />}
            </button>

            {/* Live Privacy Shield Badge */}
            <PrivacyShieldBadge />

            {/* Global FX Valuation Mode Switcher (Totals -1 PKR vs Live vs Snapshot) */}
            <div className="hidden md:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <Coins className="w-3.5 h-3.5 text-amber-400 ml-1.5 mr-1" />
              <select
                value={fxValuationMode}
                onChange={(e) => setFxValuationMode(e.target.value as FXValuationMode)}
                className="bg-transparent text-[11px] font-bold text-slate-200 focus:outline-none cursor-pointer pr-1"
                title="Global FX Mode: Conservative (Totals tab -1 PKR spread), Live Mid-Market, or Fixed Snapshot (Income tab)"
              >
                <option value="CONSERVATIVE_SPREAD" className="bg-slate-900 text-white">
                  🛡️ Conservative (-1 PKR)
                </option>
                <option value="LIVE_MID_MARKET" className="bg-slate-900 text-white">
                  ⚡ Live Mid-Market
                </option>
                <option value="FIXED_SNAPSHOT" className="bg-slate-900 text-white">
                  📌 Fixed Snapshot (Income Tab)
                </option>
              </select>
            </div>

            {/* Multimodal Bill & OCR Scanner Trigger */}
            <button
              onClick={onOpenBillScanner}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 rounded-lg text-xs font-semibold transition"
              title="Scan Bill / PDF Statement (Local OCR + BYOK Vision)"
            >
              <ScanLine className="h-3.5 w-3.5 text-teal-400" />
              <span className="hidden lg:inline">Scan Bill</span>
            </button>

            {/* Voice Logger Modal Trigger */}
            <button
              onClick={onOpenVoiceLogger}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 rounded-lg text-xs font-semibold transition"
              title="Voice Note Expense Logger (Hands-Free Speech NLP)"
            >
              <Mic className="h-3.5 w-3.5 text-rose-400" />
              <span className="hidden lg:inline">Voice</span>
            </button>

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
              <span className="hidden 2xl:inline">Paste SMS</span>
              <kbd className="hidden xl:inline-block ml-1 px-1 py-0.2 text-[9px] font-mono bg-slate-900 border border-slate-700 rounded text-slate-400">Ctrl+V</kbd>
            </button>

            {/* Google Sheet Sync Button in Navbar */}
            {onOpenGoogleSheetModal && (
              <button
                type="button"
                onClick={onOpenGoogleSheetModal}
                className="hidden md:flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-lg text-xs font-semibold transition"
                title="Google Sheet Live Sync (1UybhQ...)"
              >
                <ArrowLeftRight className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden xl:inline">Google Sheet</span>
              </button>
            )}

            {/* Currency Toggle (PKR / AED / USD) */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setPrimaryCurrency('PKR')}
                className={`px-1.5 sm:px-2 py-1 rounded transition-colors ${
                  primaryCurrency === 'PKR' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="View in Pakistani Rupees"
              >
                PKR
              </button>
              <button
                onClick={() => setPrimaryCurrency('AED')}
                className={`px-1.5 sm:px-2 py-1 rounded transition-colors ${
                  primaryCurrency === 'AED' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="View in UAE Dirhams"
              >
                AED
              </button>
              <button
                onClick={() => setPrimaryCurrency('USD')}
                className={`px-1.5 sm:px-2 py-1 rounded transition-colors ${
                  primaryCurrency === 'USD' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="View in US Dollars"
              >
                USD
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
            onClick={() => setActiveTab('coordinators')}
            className={`px-3 py-1 rounded-md whitespace-nowrap flex items-center space-x-1 ${activeTab === 'coordinators' ? 'bg-slate-800 text-teal-400' : 'text-slate-400'}`}
          >
            <Users className="h-3 w-3" />
            <span>Coordinators</span>
          </button>
          <button
            onClick={() => setActiveTab('reminders')}
            className={`px-3 py-1 rounded-md whitespace-nowrap flex items-center space-x-1 ${activeTab === 'reminders' ? 'bg-slate-800 text-teal-400' : 'text-slate-400'}`}
          >
            <Calendar className="h-3 w-3" />
            <span>Schedules</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1 rounded-md whitespace-nowrap flex items-center space-x-1 ${activeTab === 'reports' ? 'bg-slate-800 text-amber-400' : 'text-slate-400'}`}
          >
            <FileText className="h-3 w-3" />
            <span>Reports</span>
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`px-3 py-1 rounded-md whitespace-nowrap flex items-center space-x-1 ${activeTab === 'loans' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400'}`}
          >
            <HandCoins className="h-3 w-3" />
            <span>Loans</span>
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
          <button
            onClick={() => setActiveTab('studio')}
            className={`px-3 py-1 rounded-md whitespace-nowrap ${activeTab === 'studio' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400'}`}
          >
            Studio
          </button>
        </div>
      </div>
    </header>
  );
};
