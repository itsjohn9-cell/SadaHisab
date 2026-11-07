import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Fingerprint, 
  Delete, 
  KeyRound, 
  AlertCircle,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { 
  verifyPin, 
  hashPin, 
  authenticateWithBiometrics, 
  registerBiometricCredential, 
  isBiometricsAvailable,
  checkBiometricsSupported
} from '../services/cryptoSecurity';
import { AppSecuritySettings } from '../types';

interface AppLockScreenProps {
  securitySettings: AppSecuritySettings;
  onUnlock: () => void;
  onSaveSecuritySettings?: (settings: AppSecuritySettings) => Promise<void>;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
  securitySettings,
  onUnlock,
  onSaveSecuritySettings
}) => {
  const isInitialSetup = !securitySettings.pinHash;
  const [setupStep, setSetupStep] = useState<'ENTER' | 'CONFIRM' | 'BIOMETRICS'>('ENTER');
  const [pinLength, setPinLength] = useState<number>(securitySettings.pinLength || 4);
  const [firstPin, setFirstPin] = useState<string>('');
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBiometricPrompting, setIsBiometricPrompting] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const targetLength = isInitialSetup ? pinLength : (securitySettings.pinLength || 4);

  // Auto trigger biometrics on lock screen mount if configured
  useEffect(() => {
    if (!isInitialSetup && securitySettings.hasBiometrics && securitySettings.biometricCredentialId) {
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
    if (pinInput.length < targetLength) {
      const next = pinInput + num;
      setPinInput(next);
      setErrorMessage(null);
      if (next.length === targetLength) {
        if (isInitialSetup) {
          handleSetupPinStep(next);
        } else {
          checkPin(next);
        }
      }
    }
  };

  const handleSetupPinStep = async (next: string) => {
    if (setupStep === 'ENTER') {
      setFirstPin(next);
      setSetupStep('CONFIRM');
      setPinInput('');
    } else if (setupStep === 'CONFIRM') {
      if (next === firstPin) {
        // PIN confirmed! Hash and save
        const { hash, salt } = await hashPin(next);
        const newSettings: AppSecuritySettings = {
          ...securitySettings,
          isAppLockEnabled: true,
          pinHash: hash,
          pinSalt: salt,
          pinLength: pinLength,
          autoLockTimeoutMs: securitySettings.autoLockTimeoutMs || 300000
        };

        if (onSaveSecuritySettings) {
          await onSaveSecuritySettings(newSettings);
        }

        const bioSupported = await checkBiometricsSupported();
        if (bioSupported) {
          setSetupStep('BIOMETRICS');
        } else {
          onUnlock();
        }
      } else {
        setIsShaking(true);
        setErrorMessage('PIN did not match. Please re-enter.');
        setTimeout(() => {
          setIsShaking(false);
          setPinInput('');
          setSetupStep('ENTER');
          setFirstPin('');
        }, 600);
      }
    }
  };

  const handleEnableBiometrics = async () => {
    setIsBiometricPrompting(true);
    const res = await registerBiometricCredential();
    setIsBiometricPrompting(false);
    if (res.success && res.credentialId && onSaveSecuritySettings) {
      await onSaveSecuritySettings({
        ...securitySettings,
        isAppLockEnabled: true,
        hasBiometrics: true,
        biometricCredentialId: res.credentialId
      });
    }
    onUnlock();
  };

  const handleDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const checkPin = async (input: string) => {
    if (!securitySettings.pinHash || !securitySettings.pinSalt) return;
    const isValid = await verifyPin(input, securitySettings.pinHash, securitySettings.pinSalt);
    if (isValid) {
      onUnlock();
    } else {
      setIsShaking(true);
      setErrorMessage('Incorrect PIN. Please try again.');
      setTimeout(() => {
        setIsShaking(false);
        setPinInput('');
      }, 500);
    }
  };

  if (isInitialSetup && setupStep === 'BIOMETRICS') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 select-none">
        <div className="max-w-xs w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-center">
          <div className="h-16 w-16 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Fingerprint className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-white tracking-tight">Enable Biometric Login?</h2>
            <p className="text-xs text-slate-400">
              Unlock instantly using TouchID or Fingerprint without typing your PIN every time.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={handleEnableBiometrics}
              disabled={isBiometricPrompting}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Fingerprint className="h-4 w-4" />
              <span>{isBiometricPrompting ? 'Prompting Sensor...' : 'Enable Fingerprint / TouchID'}</span>
            </button>
            <button
              onClick={onUnlock}
              className="w-full py-2.5 text-xs text-slate-400 hover:text-white transition"
            >
              Skip for Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 select-none">
      <div className={`max-w-xs w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-center ${
        isShaking ? 'animate-bounce' : ''
      }`}>
        
        {/* Shield Header */}
        <div className="space-y-2">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {isInitialSetup 
              ? (setupStep === 'CONFIRM' ? 'Confirm Master PIN' : 'Create Master PIN')
              : 'Sada Hisab Vault'}
          </h2>
          <p className="text-xs text-slate-400">
            {isInitialSetup
              ? (setupStep === 'CONFIRM' 
                  ? `Re-enter your ${pinLength}-digit PIN to confirm` 
                  : `Set a ${pinLength}-digit PIN to secure your ledger`)
              : 'Protected by Zero-Trust PBKDF2 Encryption'}
          </p>
        </div>

        {/* PIN Length Switcher (Setup Step 1 only) */}
        {isInitialSetup && setupStep === 'ENTER' && (
          <div className="flex justify-center pt-1">
            <div className="inline-flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-xl text-xs space-x-1">
              <button
                type="button"
                onClick={() => { setPinLength(4); setPinInput(''); }}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  pinLength === 4
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                4 Digits
              </button>
              <button
                type="button"
                onClick={() => { setPinLength(6); setPinInput(''); }}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  pinLength === 6
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                6 Digits
              </button>
            </div>
          </div>
        )}

        {/* PIN Dots Indicator */}
        <div className="flex justify-center space-x-3 py-1">
          {Array.from({ length: targetLength }).map((_, idx) => (
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
          <div className="text-xs text-rose-400 font-semibold flex items-center justify-center space-x-1 animate-in fade-in px-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="leading-tight">{errorMessage}</span>
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

          {/* Biometrics button (or Clear in setup mode) */}
          {!isInitialSetup ? (
            <button
              type="button"
              onClick={() => {
                if (securitySettings.hasBiometrics) {
                  handleBiometricUnlock();
                } else {
                  setErrorMessage('Biometrics not enabled. Unlock with PIN, then enable in Settings (Lock icon in top bar).');
                }
              }}
              disabled={isBiometricPrompting}
              className={`h-14 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 flex items-center justify-center transition active:scale-95 ${
                securitySettings.hasBiometrics 
                  ? 'text-emerald-400 hover:text-emerald-300' 
                  : 'text-slate-500 hover:text-slate-400'
              }`}
              title={securitySettings.hasBiometrics ? "Biometric Unlock (TouchID / Fingerprint)" : "Biometrics not configured"}
            >
              <Fingerprint className="h-6 w-6" />
            </button>
          ) : (
            <div className="h-14 flex items-center justify-center text-xs text-slate-500 font-medium">
              {setupStep === 'CONFIRM' ? 'Step 2/2' : 'Step 1/2'}
            </div>
          )}

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

        {/* Security guarantee note */}
        <div className="pt-2 text-[11px] text-slate-500">
          {isInitialSetup 
            ? 'Stored 100% on-device in secure IndexedDB. Never sent to any cloud.'
            : 'Locked automatically after inactivity or app minimization.'}
        </div>

      </div>
    </div>
  );
};
