import React, { useState, useEffect } from 'react';
import { 
  parseBulkSMSMessages, 
  parseSMSMessage 
} from '../services/smsParser';
import { 
  ParsedSMSResult, 
  Account, 
  Transaction, 
  MerchantRule 
} from '../types';
import { 
  db, 
  getBlockedOTPCounter, 
  learnMerchantRule, 
  recalculateAllAccountBalances 
} from '../db/db';
import { convertToPKR } from '../services/fxService';
import { formatCurrency, formatDatePretty } from '../utils/formatters';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles, 
  Send, 
  CheckCheck, 
  Phone, 
  Fuel, 
  BookmarkPlus, 
  Trash2, 
  Smartphone, 
  Check, 
  AlertTriangle,
  Copy,
  Info
} from 'lucide-react';
import { AndroidBridgeModal } from './AndroidBridgeModal';

interface MagicInboxViewProps {
  accounts: Account[];
  onRefreshData: () => void;
  initialPastedText?: string;
}

export const MagicInboxView: React.FC<MagicInboxViewProps> = ({
  accounts,
  onRefreshData,
  initialPastedText = ''
}) => {
  const [inputText, setInputText] = useState(initialPastedText);
  const [parsedResults, setParsedResults] = useState<ParsedSMSResult[]>([]);
  const [blockedCount, setBlockedCount] = useState<number>(0);
  const [isParsing, setIsParsing] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Load blocked OTP counter from DB
  const loadBlockedCount = async () => {
    const count = await getBlockedOTPCounter();
    setBlockedCount(count);
  };

  useEffect(() => {
    loadBlockedCount();
  }, []);

  // Parse whenever initialPastedText changes
  useEffect(() => {
    if (initialPastedText) {
      setInputText(initialPastedText);
      handleParseText(initialPastedText);
    }
  }, [initialPastedText]);

  // Main Parse Handler
  const handleParseText = async (textToParse: string) => {
    if (!textToParse.trim()) return;
    setIsParsing(true);
    const results = await parseBulkSMSMessages(textToParse);
    setParsedResults(results);
    await loadBlockedCount();
    setIsParsing(false);
  };

  // Sample Presets for Testing
  const handleLoadSampleText = (type: 'ADCB' | 'AL_HABIB' | 'PSO' | 'EASYPAISA' | 'OTP_ATTEMPT') => {
    let sample = '';
    switch (type) {
      case 'ADCB':
        sample = `Your ADCB Cr.Card ending 4821 was used for AED 365.87 at Lulu Hypermarket Khalidiyah on 04/11/2026. Avail Limit: AED 14,200.00.`;
        break;
      case 'AL_HABIB':
        sample = `Dear Customer, PKR 12,525 has been debited from your A/C 1020-001 to Green Island Foundation on 05-NOV-26. Ref: GI-98214.`;
        break;
      case 'PSO':
        sample = `SCB Alert: Rs. 12,500.00 spent on Card ending 7890 at PSO Petrol Station on 02/11/2026 for 45.20 Litres @ 276.50/L.`;
        break;
      case 'EASYPAISA':
        sample = `Rs. 15,000 sent to 03009876543 (Maulana Qalbe Ali) from Easypaisa account on 04-11-2026. Trans ID 88392102. Fee Rs 0.00.`;
        break;
      case 'OTP_ATTEMPT':
        sample = `Your ADCB OTP verification code is 492018 for transaction of AED 365.87. Valid for 5 mins. Do not share this code with anyone.`;
        break;
    }
    setInputText(sample);
    handleParseText(sample);
  };

  // Post single item to Ledger
  const handleCommitSingle = async (result: ParsedSMSResult, index: number) => {
    if (result.isOTPBlocked) return;

    const converted = await convertToPKR(result.amount, result.currency);

    const newTx: Transaction = {
      id: `sms-tx-${Date.now()}-${index}`,
      date: result.date,
      type: result.direction,
      amount: result.amount,
      currency: result.currency,
      convertedAmountPKR: converted.amountPKR,
      fxRateUsed: converted.fxRate,
      category: result.category,
      subCategory: result.subCategory,
      merchantOrRecipient: result.merchantOrRecipient,
      sourceAccountId: result.inferredAccountId,
      beneficiaryPhone: result.beneficiaryPhone,
      paymentChannel: result.paymentChannel,
      fuelDetails: result.fuelDetails,
      description: `Magic Inbox parsed from: ${result.rawText.slice(0, 40)}...`,
      status: 'CONFIRMED'
    };

    await db.transactions.add(newTx);
    await recalculateAllAccountBalances();

    // Remove from parsed list
    const updated = [...parsedResults];
    updated.splice(index, 1);
    setParsedResults(updated);

    setSuccessToast(`Posted ${formatCurrency(result.amount, result.currency)} to Ledger!`);
    setTimeout(() => setSuccessToast(null), 3000);
    onRefreshData();
  };

  // Post all valid items
  const handleCommitAll = async () => {
    const validItems = parsedResults.filter(r => !r.isOTPBlocked && r.amount > 0);
    if (validItems.length === 0) return;

    for (let i = 0; i < validItems.length; i++) {
      const result = validItems[i];
      const converted = await convertToPKR(result.amount, result.currency);

      const newTx: Transaction = {
        id: `sms-bulk-${Date.now()}-${i}`,
        date: result.date,
        type: result.direction,
        amount: result.amount,
        currency: result.currency,
        convertedAmountPKR: converted.amountPKR,
        fxRateUsed: converted.fxRate,
        category: result.category,
        subCategory: result.subCategory,
        merchantOrRecipient: result.merchantOrRecipient,
        sourceAccountId: result.inferredAccountId,
        beneficiaryPhone: result.beneficiaryPhone,
        paymentChannel: result.paymentChannel,
        fuelDetails: result.fuelDetails,
        description: `Magic Inbox batch parsed: ${result.merchantOrRecipient}`,
        status: 'CONFIRMED'
      };
      await db.transactions.add(newTx);
    }

    await recalculateAllAccountBalances();
    setParsedResults([]);
    setInputText('');
    setSuccessToast(`Successfully posted ${validItems.length} transactions to Ledger!`);
    setTimeout(() => setSuccessToast(null), 3500);
    onRefreshData();
  };

  // Learn Adaptive Rule
  const handleLearnRule = async (result: ParsedSMSResult) => {
    await learnMerchantRule(
      result.merchantOrRecipient,
      result.category,
      result.subCategory,
      result.inferredAccountId
    );
    setSuccessToast(`Learned: "${result.merchantOrRecipient}" will always map to ${result.category}!`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner with OTP Security Firewall Status */}
      <div className="bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 border border-emerald-900/50 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-white tracking-tight">Magic Inbox & Smart Receipt Parser</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>OTP Firewall Active</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Paste raw SMS text, WhatsApp receipts, or notification dumps. Automatically detects multi-currency banks, categories, fuel liters, phone numbers, and eliminates manual data entry.
              </p>
            </div>
          </div>

          {/* Security Counter & Android Companion Trigger */}
          <div className="flex items-center space-x-3 self-start lg:self-center">
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-1.5 text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Protected OTPs</span>
              <div className="text-sm font-extrabold text-emerald-400 font-mono">
                {blockedCount} Scrubbed
              </div>
            </div>

            <button
              onClick={() => setShowAndroidModal(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <Smartphone className="h-4 w-4 text-emerald-400" />
              <span>Android Bridge</span>
            </button>
          </div>
        </div>

        {successToast && (
          <div className="mt-4 p-3 bg-emerald-950/90 border border-emerald-700 text-emerald-200 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>{successToast}</span>
          </div>
        )}
      </div>

      {/* Input Text Box & Quick Presets */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <span>Paste Single or Bulk SMS / Receipts (or press Ctrl+V anywhere)</span>
          </label>

          {/* Quick Test Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-500 mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => handleLoadSampleText('ADCB')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium border border-slate-700"
            >
              ADCB (AED)
            </button>
            <button
              type="button"
              onClick={() => handleLoadSampleText('AL_HABIB')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium border border-slate-700"
            >
              Green Island (PKR)
            </button>
            <button
              type="button"
              onClick={() => handleLoadSampleText('PSO')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium border border-slate-700"
            >
              PSO Petrol (Liters)
            </button>
            <button
              type="button"
              onClick={() => handleLoadSampleText('EASYPAISA')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium border border-slate-700"
            >
              Easypaisa Maulana
            </button>
            <button
              type="button"
              onClick={() => handleLoadSampleText('OTP_ATTEMPT')}
              className="px-2 py-0.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded font-medium border border-rose-800"
              title="Test OTP Security Firewall"
            >
              Test OTP Block
            </button>
          </div>
        </div>

        <div className="relative">
          <textarea
            rows={4}
            placeholder="Paste your bank SMS here... e.g. 'Your ADCB Cr.Card ending 4821 was used for AED 365.87 at Lulu Hypermarket on 04/11/2026' or 'PKR 12,525 debited from Al Habib to Green Island Foundation'..."
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              handleParseText(e.target.value);
            }}
            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center space-x-1">
            <Info className="h-3.5 w-3.5 text-emerald-400" />
            <span>Supports bulk inputs separated by blank lines or multiple SMS entries.</span>
          </span>

          <div className="flex items-center space-x-2">
            {parsedResults.length > 0 && (
              <button
                type="button"
                onClick={() => { setInputText(''); setParsedResults([]); }}
                className="text-slate-400 hover:text-white px-2 py-1"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => handleParseText(inputText)}
              disabled={isParsing || !inputText.trim()}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isParsing ? 'Parsing...' : 'Parse Text'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Parsed Cards Output Section */}
      {parsedResults.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <span>Parsed Candidates ({parsedResults.filter(r => !r.isOTPBlocked).length} ready)</span>
            </h4>

            {parsedResults.some(r => !r.isOTPBlocked) && (
              <button
                onClick={handleCommitAll}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-950/40 transition"
              >
                <CheckCheck className="h-4 w-4" />
                <span>Commit All to Ledger</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {parsedResults.map((result, idx) => {
              if (result.isOTPBlocked) {
                return (
                  <div 
                    key={idx}
                    className="bg-rose-950/30 border border-rose-800/80 rounded-2xl p-5 space-y-3 relative overflow-hidden animate-in fade-in"
                  >
                    <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs">
                      <ShieldAlert className="h-4 w-4 text-rose-400" />
                      <span>OTP SECURITY FIREWALL INTERCEPTED</span>
                    </div>
                    <p className="text-xs text-rose-200/90 font-mono">
                      {result.blockedReason}
                    </p>
                    <div className="text-[10px] text-rose-400/80 pt-1 border-t border-rose-900/60">
                      Message content was wiped from memory and never persisted in database.
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={idx}
                  className="bg-slate-900/90 border border-slate-800 hover:border-emerald-700/60 rounded-2xl p-5 shadow-xl space-y-3.5 transition group"
                >
                  {/* Card Header: Direction & Amount */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        result.direction === 'INCOME' 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                          : result.direction === 'CREDIT_CARD_SWIPE'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {result.direction.replace('_', ' ')}
                      </span>
                      <h4 className="text-base font-bold text-white mt-1">
                        {result.merchantOrRecipient}
                      </h4>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-extrabold text-white font-mono tracking-tight">
                        {formatCurrency(result.amount, result.currency)}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{result.currency}</span>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Target Account:</span>
                      <div className="text-slate-200 font-semibold truncate mt-0.5">
                        {accounts.find(a => a.id === result.inferredAccountId)?.name || result.inferredAccountId}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500">Category / Sub:</span>
                      <div className="text-emerald-400 font-semibold truncate mt-0.5">
                        {result.category} {result.subCategory ? `• ${result.subCategory}` : ''}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500">Date:</span>
                      <div className="text-slate-300 font-mono mt-0.5">
                        {formatDatePretty(result.date)}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500">Parser Rule:</span>
                      <div className="text-cyan-300 font-mono truncate mt-0.5">
                        {result.ruleApplied}
                      </div>
                    </div>
                  </div>

                  {/* Beneficiary Phone / Fuel Liters Indicators */}
                  {(result.beneficiaryPhone || result.fuelDetails) && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {result.beneficiaryPhone && (
                        <span className="inline-flex items-center text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                          <Phone className="h-3 w-3 mr-1" />
                          {result.beneficiaryPhone} ({result.paymentChannel || 'Phone'})
                        </span>
                      )}

                      {result.fuelDetails && (
                        <span className="inline-flex items-center text-[10px] font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                          <Fuel className="h-3 w-3 mr-1 text-amber-400" />
                          {result.fuelDetails.liters ? `${result.fuelDetails.liters} Liters` : ''} 
                          {result.fuelDetails.pricePerLiter ? ` @ Rs ${result.fuelDetails.pricePerLiter}` : ''}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleLearnRule(result)}
                      className="flex items-center space-x-1 text-xs text-slate-400 hover:text-emerald-400 transition"
                      title="Save permanent mapping rule so future SMS from this merchant auto-categorize"
                    >
                      <BookmarkPlus className="h-3.5 w-3.5" />
                      <span>Always map this</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCommitSingle(result, idx)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve & Post</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Android Bridge Modal */}
      <AndroidBridgeModal
        isOpen={showAndroidModal}
        onClose={() => setShowAndroidModal(false)}
      />

    </div>
  );
};
