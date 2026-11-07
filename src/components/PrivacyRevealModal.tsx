import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Fingerprint, 
  Delete, 
  AlertCircle, 
  X, 
  Eye 
} from 'lucide-react';
import { verifyPin, authenticateWithBiometrics } from '../services/cryptoSecurity';
import { AppSecuritySettings } from '../types';

interface PrivacyRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  securitySettings: AppSecuritySettings;
}

export const PrivacyRevealModal: React.FC<PrivacyRevealModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  securitySettings
}) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBiometricPrompting, setIsBiometricPrompting] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setErrorMessage(null);
      // Auto trigger biometrics if enabled
      if (securitySettings.hasBiometrics && securitySettings.biometricCredentialId) {
        handleBiometricAuth();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBiometricAuth = async () => {
    setIsBiometricPrompting(true);
    setErrorMessage(null);
    const result = await authenticateWithBiometrics(securitySettings.biometricCredentialId);
    setIsBiometricPrompting(false);
    if (result.success) {
      onSuccess();
      onClose();
    } else if (result.error && !result.error.toLowerCase().includes('cancel')) {
      setErrorMessage(result.error);
    }
  };

  const targetLength = securitySettings.pinLength || 4;

  const handleKeyPress = (num: string) => {
    if (pinInput.length < targetLength) {
      const next = pinInput + num;
      setPinInput(next);
      setErrorMessage(null);
      if (next.length === targetLength) {
        checkPin(next);
      }
    }
  };

  const handleDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const checkPin = async (input: string) => {
    if (!securitySettings.pinHash || !securitySettings.pinSalt) {
      // If no PIN set, allow unmask
      onSuccess();
      onClose();
      return;
    }

    const isValid = await verifyPin(input, securitySettings.pinHash, securitySettings.pinSalt);
    if (isValid) {
      onSuccess();
      onClose();
    } else {
      setIsShaking(true);
      setErrorMessage('Incorrect PIN. Please try again.');
      setTimeout(() => {
        setIsShaking(false);
        setPinInput('');
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none animate-in fade-in">
      <div className={`max-w-xs w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-center relative ${
        isShaking ? 'animate-bounce' : ''
      }`}>
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Shield Header */}
        <div className="space-y-2 pt-2">
          <div className="h-12 w-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Eye className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Security Check Required</h2>
          <p className="text-xs text-slate-400 px-2">
            Verify your identity with TouchID / Fingerprint or your {targetLength}-digit Master PIN to unmask confidential balances.
          </p>
        </div>

        {/* PIN Dots Indicator */}
        <div className="flex justify-center space-x-3 py-1">
          {Array.from({ length: targetLength }).map((_, idx) => (
            <div
              key={idx}
              className={`h-3 w-3 rounded-full transition-all duration-200 ${
                pinInput.length > idx 
                  ? 'bg-amber-400 scale-125 shadow-lg shadow-amber-500/50' 
                  : 'bg-slate-800 border border-slate-700'
              }`}
            />
          ))}
        </div>

        {errorMessage && (
          <div className="text-xs text-rose-400 font-semibold flex items-center justify-center space-x-1 animate-in fade-in">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-12 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-base font-bold text-white transition active:scale-95 shadow-sm"
            >
              {num}
            </button>
          ))}

          {/* Biometrics button */}
          <button
            type="button"
            onClick={() => {
              if (securitySettings.hasBiometrics) {
                handleBiometricAuth();
              } else {
                setErrorMessage('Biometrics not configured. Enter PIN.');
              }
            }}
            disabled={isBiometricPrompting}
            className={`h-12 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 flex items-center justify-center transition active:scale-95 ${
              securitySettings.hasBiometrics ? 'text-emerald-400' : 'text-slate-500'
            }`}
            title="Biometric Unlock (Fingerprint / TouchID)"
          >
            <Fingerprint className="h-5 w-5" />
          </button>

          {/* 0 */}
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-base font-bold text-white transition active:scale-95 shadow-sm"
          >
            0
          </button>

          {/* Backspace */}
          <button
            type="button"
            onClick={handleDelete}
            className="h-12 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-95"
            title="Delete"
          >
            <Delete className="h-4 w-4" />
          </button>
        </div>

        {/* Quick hint */}
        <div className="pt-1 text-[11px] text-slate-500">
          Balances will automatically re-mask upon 2 minutes of inactivity or app lock.
        </div>
      </div>
    </div>
  );
};

