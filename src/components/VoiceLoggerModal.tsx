import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  Check, 
  X, 
  Pause, 
  Play, 
  Edit3, 
  RotateCcw,
  Volume2
} from 'lucide-react';
import { 
  parseVoiceTranscript, 
  isSpeechRecognitionSupported, 
  ParsedVoiceResult 
} from '../services/voiceLogger';
import { db, recalculateAllAccountBalances } from '../db/db';
import { convertToPKR } from '../services/fxService';
import { formatCurrency } from '../utils/formatters';
import { Account, Transaction } from '../types';

interface VoiceLoggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onSuccess: () => void;
}

export const VoiceLoggerModal: React.FC<VoiceLoggerModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onSuccess
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [parsedResult, setParsedResult] = useState<ParsedVoiceResult | null>(null);
  const [countdown, setCountdown] = useState<number>(3);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Editable fields
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editMerchant, setEditMerchant] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editAccount, setEditAccount] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      setParsedResult(null);
      setCountdown(3);
      setIsPaused(false);
      setIsEditing(false);
      startSpeechRecognition();
    } else {
      stopSpeechRecognition();
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      stopSpeechRecognition();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  // Handle 3-second auto-save countdown
  useEffect(() => {
    if (parsedResult && parsedResult.amount > 0 && !isPaused && !isEditing) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleCommitVoiceTransaction();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [parsedResult, isPaused, isEditing]);

  const startSpeechRecognition = () => {
    if (!isSpeechRecognitionSupported()) return;
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const text = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setTranscript(text);

        if (event.results[0].isFinal) {
          const parsed = parseVoiceTranscript(text);
          setParsedResult(parsed);
          setEditAmount(parsed.amount);
          setEditMerchant(parsed.merchantOrRecipient);
          setEditCategory(parsed.category);
          setEditAccount(parsed.inferredAccountId);
          setCountdown(3);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  };

  // Quick preset voice simulator for instant testing
  const handleTestPhrase = (phrase: string) => {
    stopSpeechRecognition();
    setTranscript(phrase);
    const parsed = parseVoiceTranscript(phrase);
    setParsedResult(parsed);
    setEditAmount(parsed.amount);
    setEditMerchant(parsed.merchantOrRecipient);
    setEditCategory(parsed.category);
    setEditAccount(parsed.inferredAccountId);
    setCountdown(3);
    setIsPaused(false);
  };

  const handleCommitVoiceTransaction = async () => {
    if (!parsedResult) return;

    const finalAmount = isEditing ? editAmount : parsedResult.amount;
    const finalMerchant = isEditing ? editMerchant : parsedResult.merchantOrRecipient;
    const finalCategory = isEditing ? editCategory : parsedResult.category;
    const finalAccount = isEditing ? editAccount : parsedResult.inferredAccountId;

    if (finalAmount <= 0) return;

    const converted = await convertToPKR(finalAmount, parsedResult.currency);

    const tx: Transaction = {
      id: `voice-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: parsedResult.direction,
      amount: finalAmount,
      currency: parsedResult.currency,
      convertedAmountPKR: converted.amountPKR,
      fxRateUsed: converted.fxRate,
      category: finalCategory,
      subCategory: parsedResult.subCategory,
      merchantOrRecipient: finalMerchant,
      sourceAccountId: parsedResult.direction !== 'INCOME' ? finalAccount : undefined,
      destinationAccountId: parsedResult.direction === 'TRANSFER' ? parsedResult.destinationAccountId : parsedResult.direction === 'INCOME' ? finalAccount : undefined,
      description: `Voice Note logged: "${parsedResult.rawTranscript}"`,
      status: 'CONFIRMED',
      sourceChannel: 'VOICE'
    };

    await db.transactions.add(tx);
    await recalculateAllAccountBalances();
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-center animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Volume2 className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white tracking-tight">Voice Note Expense Logger</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Animated Mic Button & Status */}
        <div className="py-2">
          <div 
            onClick={isListening ? stopSpeechRecognition : startSpeechRecognition}
            className={`h-24 w-24 mx-auto rounded-full flex items-center justify-center cursor-pointer transition-all ${
              isListening 
                ? 'bg-rose-500/20 border-2 border-rose-500 animate-pulse text-rose-400 shadow-xl shadow-rose-500/30' 
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {isListening ? <Mic className="h-10 w-10 animate-bounce" /> : <Mic className="h-10 w-10" />}
          </div>
          <p className="text-xs font-semibold text-slate-300 mt-3">
            {isListening ? 'Listening... Speak naturally in English, Urdu, or Arabic terms' : 'Tap microphone to speak'}
          </p>
        </div>

        {/* Live Transcript Box */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 min-h-[48px] text-xs font-mono text-slate-300 text-left">
          {transcript || 'e.g. "Paid 365 point 87 Dirhams for DEWA bill from ADCB" or "Sent 12525 rupees to Green Island School"...'}
        </div>

        {/* Parsed Result & Auto-Save Countdown */}
        {parsedResult && parsedResult.amount > 0 && (
          <div className="bg-slate-950/80 border border-emerald-700/60 rounded-2xl p-4 text-left space-y-3 animate-in fade-in">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {parsedResult.direction}
                </span>
                <h4 className="text-base font-bold text-white mt-1">
                  {isEditing ? editMerchant : parsedResult.merchantOrRecipient}
                </h4>
              </div>

              <div className="text-right">
                <div className="text-xl font-extrabold text-white font-mono">
                  {formatCurrency(isEditing ? editAmount : parsedResult.amount, parsedResult.currency)}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{parsedResult.currency}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/60">
              <div>
                <span className="text-slate-500">Account:</span>
                <div className="text-slate-300 font-semibold truncate">
                  {accounts.find(a => a.id === (isEditing ? editAccount : parsedResult.inferredAccountId))?.name || parsedResult.inferredAccountId}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Category:</span>
                <div className="text-emerald-400 font-semibold truncate">
                  {isEditing ? editCategory : parsedResult.category}
                </div>
              </div>
            </div>

            {/* Auto-Save Countdown Bar */}
            {!isEditing && (
              <div className="bg-emerald-950/50 border border-emerald-800/60 rounded-xl p-2.5 flex items-center justify-between text-xs text-emerald-300">
                <span className="font-semibold flex items-center space-x-1">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Auto-saving in <strong className="font-mono text-white text-sm">{countdown}s</strong>...</span>
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                    title={isPaused ? 'Resume countdown' : 'Pause countdown'}
                  >
                    {isPaused ? <Play className="h-3.5 w-3.5 text-emerald-400" /> : <Pause className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => { setIsEditing(true); setIsPaused(true); }}
                    className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                    title="Edit before saving"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Test Presets for Driving / Walk Testing */}
        <div className="text-left space-y-1.5 pt-1">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Test Voice Phrases:</span>
          <div className="flex flex-wrap gap-1 text-[11px]">
            <button
              onClick={() => handleTestPhrase("Paid 365 point 87 Dirhams for DEWA bill from ADCB")}
              className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
            >
              DEWA (AED 365.87)
            </button>
            <button
              onClick={() => handleTestPhrase("Sent 12,525 rupees to Green Island School from Al Habib")}
              className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
            >
              Green Island (Rs 12,525)
            </button>
            <button
              onClick={() => handleTestPhrase("Gave 2,650 cash from wallet for grocery")}
              className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
            >
              Grocery Cash (Rs 2,650)
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleCommitVoiceTransaction}
            disabled={!parsedResult || parsedResult.amount <= 0}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1"
          >
            <Check className="h-4 w-4" />
            <span>Save to Ledger</span>
          </button>
        </div>

      </div>
    </div>
  );
};
