import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Fingerprint, 
  Delete, 
  KeyRound, 
  AlertCircle 
} from 'lucide-react';
import { verifyPin, authenticateWithBiometrics } from '../services/cryptoSecurity';
import { AppSecuritySettings } from '../types';

interface AppLockScreenProps {
  securitySettings: AppSecuritySettings;
  onUnlock: () => void;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
  securitySettings,
  onUnlock
}) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBiometricPrompting, setIsBiometricPrompting] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // Auto trigger biometrics on lock screen mount if configured
  useEffect(() => {
    if (securitySettings.hasBiometrics && securitySettings.biometricCredentialId) {
      handleBiometricUnlock();
    }
  }, []);

  const handleBiometricUnlock = async () => {
    setIsBiometricPrompting(true);
    setErrorMessage(null);
    const result = await authenticateWithBiometrics(securitySettings.biometricCredentialId);
    setIsBiometricPrompting(false);
    if (result.success) {
      onUnlock();
    } else if (result.error && !result.error.toLowerCase().includes('cancel')) {
      setErrorMessage(result.error);
    }
  };

  const handleKeyPress = (num: string) => {
    if (pinInput.length < 6) {
      const next = pinInput + num;
      setPinInput(next);
      setErrorMessage(null);
      // If reached 4, 5, or 6 digits, check PIN
      if (next.length >= 4) {
        checkPin(next);
      }
    }
  };

  const handleDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    setPinInput('');
    setErrorMessage(null);
  };

  const checkPin = async (input: string) => {
    if (!securitySettings.pinHash || !securitySettings.pinSalt) return;
    const isValid = await verifyPin(input, securitySettings.pinHash, securitySettings.pinSalt);
    if (isValid) {
      onUnlock();
    } else {
      if (input.length === 6) {
        // Trigger shake and clear
        setIsShaking(true);
        setErrorMessage('Incorrect PIN. Please try again.');
        setTimeout(() => {
          setIsShaking(false);
          setPinInput('');
        }, 500);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 select-none">
      <div className={`max-w-xs w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-center ${
        isShaking ? 'animate-bounce' : ''
      }`}>
        
        {/* Shield Header */}
        <div className="space-y-2">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Sada Hisab Vault</h2>
          <p className="text-xs text-slate-400">
            Protected by Zero-Trust PBKDF2 Encryption
          </p>
        </div>

        {/* PIN Dots Indicator */}
        <div className="flex justify-center space-x-3 py-2">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className={`h-3 w-3 rounded-full transition-all duration-200 ${
                pinInput.length > idx 
                  ? 'bg-emerald-400 scale-125 shadow-lg shadow-emerald-500/50' 
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
        <div className="grid grid-cols-3 gap-3 pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-14 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 text-lg font-bold text-white transition active:scale-95 shadow-sm"
            >
              {num}
            </button>
          ))}

          {/* Biometrics button */}
          <button
            type="button"
            onClick={handleBiometricUnlock}
            disabled={!securitySettings.hasBiometrics || isBiometricPrompting}
            className="h-14 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-emerald-400 disabled:text-slate-600 disabled:opacity-40 flex items-center justify-center transition active:scale-95"
            title="Biometric Unlock (TouchID / Fingerprint)"
          >
            <Fingerprint className="h-6 w-6" />
          </button>

          {/* 0 */}
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 text-lg font-bold text-white transition active:scale-95 shadow-sm"
          >
            0
          </button>

          {/* Backspace */}
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-95"
            title="Delete"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        {/* Inactivity message */}
        <div className="pt-2 text-[11px] text-slate-500">
          Locked automatically after 5 minutes of inactivity.
        </div>

      </div>
    </div>
  );
};
