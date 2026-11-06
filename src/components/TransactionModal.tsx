import React, { useState, useEffect } from 'react';
import { 
  Account, 
  Currency, 
  TransactionType, 
  Transaction, 
  FXRate 
} from '../types';
import { 
  extractPakistaniPhone, 
  extractPaymentChannel 
} from '../services/excelHealer';
import { convertToPKR } from '../services/fxService';
import { formatCurrency } from '../utils/formatters';
import { db, recalculateAllAccountBalances } from '../db/db';
import { X, ArrowRight, Sparkles, Phone, CreditCard } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  fxRates: FXRate[];
  onSuccess: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  fxRates,
  onSuccess
}) => {
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<Currency>('PKR');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string>('Household');
  const [subCategory, setSubCategory] = useState<string>('');
  const [merchantOrRecipient, setMerchantOrRecipient] = useState<string>('');
  const [sourceAccountId, setSourceAccountId] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [beneficiaryPhone, setBeneficiaryPhone] = useState<string>('');
  const [paymentChannel, setPaymentChannel] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [convertedPKR, setConvertedPKR] = useState<number>(0);
  const [fxRateUsed, setFxRateUsed] = useState<number>(1.0);

  // Set default account when currency changes
  useEffect(() => {
    const defaultAcc = accounts.find(a => a.currency === currency);
    if (defaultAcc) {
      setSourceAccountId(defaultAcc.id);
    }
  }, [currency, accounts]);

  // Update conversion preview
  useEffect(() => {
    async function updateConversion() {
      if (amount <= 0) {
        setConvertedPKR(0);
        return;
      }
      const res = await convertToPKR(amount, currency);
      setConvertedPKR(res.amountPKR);
      setFxRateUsed(res.fxRate);
    }
    updateConversion();
  }, [amount, currency]);

  // Auto extract phone and channel when typing merchant / recipient
  const handleMerchantChange = (text: string) => {
    setMerchantOrRecipient(text);
    const phone = extractPakistaniPhone(text);
    if (phone && !beneficiaryPhone) {
      setBeneficiaryPhone(phone);
    }
    const channel = extractPaymentChannel(text);
    if (channel && !paymentChannel) {
      setPaymentChannel(channel);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      date,
      type,
      amount: Number(amount),
      currency,
      convertedAmountPKR: convertedPKR,
      fxRateUsed,
      category,
      subCategory: subCategory.trim() || undefined,
      merchantOrRecipient: merchantOrRecipient.trim() || undefined,
      sourceAccountId: type !== 'INCOME' ? sourceAccountId : undefined,
      destinationAccountId: type === 'TRANSFER' || type === 'INCOME' ? destinationAccountId : undefined,
      beneficiaryPhone: beneficiaryPhone.trim() || undefined,
      paymentChannel: paymentChannel.trim() || undefined,
      description: description.trim() || undefined,
      status: 'CONFIRMED'
    };

    await db.transactions.add(newTx);
    await recalculateAllAccountBalances();
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-white tracking-tight">Record Financial Transaction</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Type Selector Tabs */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`py-1.5 rounded-lg transition ${
                type === 'EXPENSE' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-white'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`py-1.5 rounded-lg transition ${
                type === 'INCOME' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-white'
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setType('TRANSFER')}
              className={`py-1.5 rounded-lg transition ${
                type === 'TRANSFER' ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'text-slate-400 hover:text-white'
              }`}
            >
              Transfer
            </button>
            <button
              type="button"
              onClick={() => setType('CREDIT_CARD_SWIPE')}
              className={`py-1.5 rounded-lg transition ${
                type === 'CREDIT_CARD_SWIPE' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'text-slate-400 hover:text-white'
              }`}
            >
              CC Swipe
            </button>
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-400">Amount</label>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-base font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="PKR">PKR (Rs)</option>
                <option value="AED">AED (Dh)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="SAR">SAR (Riyal)</option>
                <option value="MYR">MYR (RM)</option>
                <option value="IQD">IQD (Dinar)</option>
              </select>
            </div>
          </div>

          {currency !== 'PKR' && amount > 0 && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs flex items-center justify-between font-mono">
              <span className="text-slate-400">Effective Converted Rate:</span>
              <span className="text-emerald-400 font-bold">&asymp; {formatCurrency(convertedPKR, 'PKR')} (@ {fxRateUsed})</span>
            </div>
          )}

          {/* Accounts (Source / Destination) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {type !== 'INCOME' && (
              <div>
                <label className="text-xs text-slate-400">
                  {type === 'TRANSFER' ? 'From Account' : 'Paid From Account'}
                </label>
                <select
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}

            {(type === 'TRANSFER' || type === 'INCOME') && (
              <div className={type === 'INCOME' ? 'col-span-2' : ''}>
                <label className="text-xs text-slate-400">
                  {type === 'INCOME' ? 'Deposited Into Account' : 'To Destination Account'}
                </label>
                <select
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="">Select Account...</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Date & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Category</label>
              <input
                type="text"
                required
                placeholder="e.g. School Fees, Groceries"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          {/* Merchant / Recipient (Spent At) */}
          <div>
            <label className="text-xs text-slate-400">Merchant / Spent At / Recipient</label>
            <input
              type="text"
              placeholder="e.g., Mustafa School Fee 03123456789 Easypaisa"
              value={merchantOrRecipient}
              onChange={(e) => handleMerchantChange(e.target.value)}
              className="w-full mt-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          {/* Extracted Phone & Channel */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 flex items-center space-x-1">
                <Phone className="h-3 w-3 text-emerald-400" />
                <span>Beneficiary Phone (03xx)</span>
              </label>
              <input
                type="text"
                placeholder="03123456789"
                value={beneficiaryPhone}
                onChange={(e) => setBeneficiaryPhone(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-300 font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 flex items-center space-x-1">
                <CreditCard className="h-3 w-3 text-cyan-400" />
                <span>Payment Channel</span>
              </label>
              <input
                type="text"
                placeholder="Easypaisa / JazzCash / ADCB"
                value={paymentChannel}
                onChange={(e) => setPaymentChannel(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          {/* Notes / Description */}
          <div>
            <label className="text-xs text-slate-400">Description / Memo</label>
            <input
              type="text"
              placeholder="Optional notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full mt-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition"
            >
              Save Transaction
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

