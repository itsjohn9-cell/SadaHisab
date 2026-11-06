import React, { useState, useEffect } from 'react';
import { 
  parseSMSMessage 
} from '../services/smsParser';
import { 
  ParsedSMSResult, 
  Account, 
  Transaction 
} from '../types';
import { 
  db, 
  learnMerchantRule, 
  recalculateAllAccountBalances 
} from '../db/db';
import { convertToPKR } from '../services/fxService';
import { formatCurrency, formatDatePretty } from '../utils/formatters';
import { 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  X, 
  Check, 
  BookmarkPlus, 
  Phone, 
  Fuel, 
  ClipboardPaste
} from 'lucide-react';

interface QuickPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  initialPastedText?: string;
  onSuccess: () => void;
}

export const QuickPasteModal: React.FC<QuickPasteModalProps> = ({
  isOpen,
  onClose,
  accounts,
  initialPastedText = '',
  onSuccess
}) => {
  const [text, setText] = useState(initialPastedText);
  const [parsed, setParsed] = useState<ParsedSMSResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (initialPastedText) {
      setText(initialPastedText);
      handleParse(initialPastedText);
    }
  }, [initialPastedText]);

  const handleParse = async (val: string) => {
    if (!val.trim()) {
      setParsed(null);
      return;
    }
    setIsProcessing(true);
    const res = await parseSMSMessage(val);
    setParsed(res);
    setIsProcessing(false);
  };

  const handleCommit = async () => {
    if (!parsed || parsed.isOTPBlocked || parsed.amount <= 0) return;

    const converted = await convertToPKR(parsed.amount, parsed.currency);

    const tx: Transaction = {
      id: `quick-sms-${Date.now()}`,
      date: parsed.date,
      type: parsed.direction,
      amount: parsed.amount,
      currency: parsed.currency,
      convertedAmountPKR: converted.amountPKR,
      fxRateUsed: converted.fxRate,
      category: parsed.category,
      subCategory: parsed.subCategory,
      merchantOrRecipient: parsed.merchantOrRecipient,
      sourceAccountId: parsed.inferredAccountId,
      beneficiaryPhone: parsed.beneficiaryPhone,
      paymentChannel: parsed.paymentChannel,
      fuelDetails: parsed.fuelDetails,
      description: `Quick paste from SMS: ${parsed.merchantOrRecipient}`,
      status: 'CONFIRMED'
    };

    await db.transactions.add(tx);
    await recalculateAllAccountBalances();
    onSuccess();
    onClose();
  };

  const handleLearn = async () => {
    if (!parsed) return;
    await learnMerchantRule(
      parsed.merchantOrRecipient,
      parsed.category,
      parsed.subCategory,
      parsed.inferredAccountId
    );
    alert(`Learned rule: "${parsed.merchantOrRecipient}" will always map to ${parsed.category}!`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <ClipboardPaste className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Quick Paste SMS / Receipt (Ctrl+V)
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Input box */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">
            Paste text from clipboard:
          </label>
          <textarea
            rows={3}
            autoFocus
            placeholder="e.g. Your ADCB Cr.Card was used for AED 365.87 at Lulu on 04/11/2026..."
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleParse(e.target.value);
            }}
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* OTP Blocked Warning */}
        {parsed?.isOTPBlocked && (
          <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-xl space-y-2">
            <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              <span>OTP SECURITY FIREWALL INTERCEPTED</span>
            </div>
            <p className="text-xs text-rose-200/90 font-mono">
              {parsed.blockedReason}
            </p>
          </div>
        )}

        {/* Parsed Result Preview */}
        {parsed && !parsed.isOTPBlocked && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {parsed.direction}
                </span>
                <h4 className="text-base font-bold text-white mt-1">
                  {parsed.merchantOrRecipient}
                </h4>
              </div>

              <div className="text-right">
                <div className="text-xl font-black text-white font-mono">
                  {formatCurrency(parsed.amount, parsed.currency)}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{parsed.currency}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/60">
              <div>
                <span className="text-slate-500">Account:</span>
                <div className="text-slate-300 truncate">
                  {accounts.find(a => a.id === parsed.inferredAccountId)?.name || parsed.inferredAccountId}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Category:</span>
                <div className="text-emerald-400 truncate">
                  {parsed.category}
                </div>
              </div>
            </div>

            {(parsed.beneficiaryPhone || parsed.fuelDetails) && (
              <div className="flex items-center space-x-2 text-xs">
                {parsed.beneficiaryPhone && (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800">
                    <Phone className="h-3 w-3 mr-1" />
                    {parsed.beneficiaryPhone}
                  </span>
                )}
                {parsed.fuelDetails && (
                  <span className="text-[10px] text-amber-300 font-mono flex items-center bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800">
                    <Fuel className="h-3 w-3 mr-1 text-amber-400" />
                    {parsed.fuelDetails.liters ? `${parsed.fuelDetails.liters}L` : 'Fuel'}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          {parsed && !parsed.isOTPBlocked && (
            <button
              type="button"
              onClick={handleLearn}
              className="flex items-center space-x-1 text-xs text-slate-400 hover:text-emerald-400 transition"
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
              <span>Always map</span>
            </button>
          )}

          <div className="flex items-center space-x-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCommit}
              disabled={!parsed || parsed.isOTPBlocked || parsed.amount <= 0}
              className="flex items-center space-x-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Record to Ledger</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

