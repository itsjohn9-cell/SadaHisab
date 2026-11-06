import React from 'react';
import { 
  DollarSign, 
  Globe2, 
  Calendar, 
  FileSpreadsheet, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Layers, 
  ExternalLink,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { Currency } from '../types';

export interface GlobalFilterState {
  currency: 'PKR' | 'AED' | 'USD';
  year: 'ALL' | '2026' | '2025' | '2024';
  region: 'ALL' | 'PK' | 'AE' | 'INTL' | 'CUSTODIAL';
}

interface GlobalControlBarProps {
  primaryCurrency: 'PKR' | 'AED' | 'USD';
  setPrimaryCurrency: (cur: 'PKR' | 'AED' | 'USD') => void;
  filterState: GlobalFilterState;
  setFilterState: React.Dispatch<React.SetStateAction<GlobalFilterState>>;
  isPrivacyMasked: boolean;
  onTogglePrivacyMask: () => void;
  onOpenGoogleSheetModal: () => void;
  totalTransactionsCount: number;
}

export const GlobalControlBar: React.FC<GlobalControlBarProps> = ({
  primaryCurrency,
  setPrimaryCurrency,
  filterState,
  setFilterState,
  isPrivacyMasked,
  onTogglePrivacyMask,
  onOpenGoogleSheetModal,
  totalTransactionsCount
}) => {
  return (
    <div className="bg-slate-900/95 border-b border-slate-800 shadow-md backdrop-blur-md sticky top-16 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          
          {/* Left: Global Currency Switcher & Exchange Rates */}
          <div className="flex items-center flex-wrap gap-2">
            
            {/* Currency Switcher Label */}
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300 shrink-0">
              <span className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <DollarSign className="w-3.5 h-3.5" />
              </span>
              <span>Currency:</span>
            </div>

            {/* High-Visibility Currency Pills */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setPrimaryCurrency('PKR');
                  setFilterState(prev => ({ ...prev, currency: 'PKR' }));
                }}
                className={`px-3 py-1 rounded-lg transition-all flex items-center space-x-1 ${
                  primaryCurrency === 'PKR'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Pakistani Rupee (Base Currency)"
              >
                <span>PKR (Rs)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrimaryCurrency('AED');
                  setFilterState(prev => ({ ...prev, currency: 'AED' }));
                }}
                className={`px-3 py-1 rounded-lg transition-all flex items-center space-x-1 ${
                  primaryCurrency === 'AED'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="UAE Dirham (ADCB, Salik, DEWA)"
              >
                <span>AED (Dh)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrimaryCurrency('USD');
                  setFilterState(prev => ({ ...prev, currency: 'USD' }));
                }}
                className={`px-3 py-1 rounded-lg transition-all flex items-center space-x-1 ${
                  primaryCurrency === 'USD'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="US Dollar (Wise, PayPal, Payoneer)"
              >
                <span>USD ($)</span>
              </button>
            </div>

            {/* Live Effective FX Tooltip */}
            <div className="hidden sm:flex items-center space-x-2 text-[10px] font-mono text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
              <span className="text-emerald-400 font-semibold">1 AED ≈ 74.31</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-cyan-400 font-semibold">1 USD ≈ 278.50</span>
            </div>

          </div>

          {/* Right: Global Filters & Google Sheet Bridge */}
          <div className="flex items-center flex-wrap gap-2">
            
            {/* Global Year Filter */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-cyan-400 ml-1.5" />
              {(['ALL', '2026', '2025', '2024'] as const).map(yr => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setFilterState(prev => ({ ...prev, year: yr }))}
                  className={`px-2 py-0.5 rounded-lg text-[11px] transition ${
                    filterState.year === yr
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {yr === 'ALL' ? 'All Years' : yr}
                </button>
              ))}
            </div>

            {/* Global Regional Account Filter */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <Globe2 className="w-3.5 h-3.5 text-teal-400 ml-1.5" />
              {(['ALL', 'PK', 'AE', 'INTL', 'CUSTODIAL'] as const).map(reg => (
                <button
                  key={reg}
                  type="button"
                  onClick={() => setFilterState(prev => ({ ...prev, region: reg }))}
                  className={`px-2 py-0.5 rounded-lg text-[11px] transition ${
                    filterState.region === reg
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {reg === 'ALL' ? 'All' : reg === 'PK' ? '🇵🇰 PK' : reg === 'AE' ? '🇦🇪 UAE' : reg === 'INTL' ? '🌐 USD' : '🔒 Amanat'}
                </button>
              ))}
            </div>

            {/* Google Sheet Live Sync Pill Trigger */}
            <button
              type="button"
              onClick={onOpenGoogleSheetModal}
              className="px-3 py-1 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm group"
              title="Open Google Sheet Two-Way Live Sync Hub"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Google Sheet:</span>
              <span className="font-mono text-emerald-200">1UybhQ...</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-900 border border-emerald-600 text-emerald-200 ml-1">
                Sync ↻
              </span>
            </button>

            {/* Shoulder-Surfing Privacy Toggle */}
            <button
              type="button"
              onClick={onTogglePrivacyMask}
              className={`p-1.5 rounded-xl border transition ${
                isPrivacyMasked
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
              }`}
              title={isPrivacyMasked ? "Privacy Mask Active: Balances Hidden (Ctrl+B)" : "Toggle Privacy Mask (Ctrl+B)"}
            >
              {isPrivacyMasked ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
            </button>

          </div>

        </div>
      </div>
    </div>
  );
};

