import React, { useState } from 'react';
import { 
  AppSecuritySettings 
} from '../types';
import { 
  hashPin, 
  registerBiometricCredential, 
  isBiometricsAvailable,
  saveSecuritySettings 
} from '../services/cryptoSecurity';
import { 
  ShieldCheck, 
  Lock, 
  Fingerprint, 
  X, 
  Check, 
  AlertCircle, 
  KeyRound, 
  Clock 
} from 'lucide-react';

interface SecuritySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  securitySettings: AppSecuritySettings;
  onUpdateSettings: (settings: AppSecuritySettings) => void;
}

export const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({
  isOpen,
  onClose,
  securitySettings,
  onUpdateSettings
}) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(securitySettings.isAppLockEnabled);
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [timeoutMs, setTimeoutMs] = useState<number>(securitySettings.autoLockTimeoutMs || 300000);
  const [hasBiometrics, setHasBiometrics] = useState<boolean>(securitySettings.hasBiometrics);
  const [credentialId, setCredentialId] = useState<string | undefined>(securitySettings.biometricCredentialId);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isRegisteringBio, setIsRegisteringBio] = useState<boolean>(false);

  const biometricsSupported = isBiometricsAvailable();

  const handleRegisterBiometrics = async () => {
    setIsRegisteringBio(true);
    setErrorMsg(null);
    const res = await registerBiometricCredential();
    setIsRegisteringBio(false);

    if (res.success && res.credentialId) {
      setHasBiometrics(true);
      setCredentialId(res.credentialId);
      setSuccessMsg('Biometric authentication registered successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(res.error || 'Failed to register biometrics.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let updatedHash = securitySettings.pinHash;
    let updatedSalt = securitySettings.pinSalt;

    if (isEnabled) {
      // If setting or updating PIN
      if (pin) {
        if (pin.length < 4 || pin.length > 6) {
          setErrorMsg('PIN must be between 4 and 6 digits.');
          return;
        }
        if (pin !== confirmPin) {
          setErrorMsg('PIN confirmation does not match.');
          return;
        }
        const { hash, salt } = await hashPin(pin);
        updatedHash = hash;
        updatedSalt = salt;
      } else if (!updatedHash) {
        setErrorMsg('Please enter a 4-6 digit PIN to enable App Lock.');
        return;
      }
    }

    const newSettings: AppSecuritySettings = {
      isAppLockEnabled: isEnabled,
      pinHash: updatedHash,
      pinSalt: updatedSalt,
      hasBiometrics,
      biometricCredentialId: credentialId,
      autoLockTimeoutMs: timeoutMs,
      lastBackupDate: securitySettings.lastBackupDate
    };

    await saveSecuritySettings(newSettings);
    onUpdateSettings(newSettings);
    setSuccessMsg('Security settings saved.');
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              App Lock & Biometric Security
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Toggle App Lock */}
          <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl">
            <div>
              <h4 className="text-sm font-bold text-white">Enable Local App Lock</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Locks UI when idle and requires PIN or biometrics to unlock
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>

          {isEnabled && (
            <div className="space-y-4 pt-1 animate-in fade-in">
              
              {/* PIN Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 flex items-center space-x-1">
                    <KeyRound className="h-3 w-3 text-emerald-400" />
                    <span>{securitySettings.pinHash ? 'New PIN (Optional)' : 'Set 4-6 Digit PIN'}</span>
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono tracking-widest text-center"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">Confirm PIN</label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="••••"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono tracking-widest text-center"
                  />
                </div>
              </div>

              {/* Inactivity Timeout */}
              <div>
                <label className="text-xs text-slate-400 flex items-center space-x-1">
                  <Clock className="h-3 w-3 text-cyan-400" />
                  <span>Auto-Lock Timeout After Inactivity</span>
                </label>
                <select
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value={60000}>1 minute</option>
                  <option value={300000}>5 minutes (Recommended)</option>
                  <option value={900000}>15 minutes</option>
                  <option value={1800000}>30 minutes</option>
                </select>
              </div>

              {/* WebAuthn Biometrics Registration */}
              <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-white">
                    <Fingerprint className="h-4 w-4 text-emerald-400" />
                    <span>TouchID / Fingerprint Unlock</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {hasBiometrics ? 'Biometrics registered & ready' : biometricsSupported ? 'Supported on this device' : 'Not supported in this environment'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRegisterBiometrics}
                  disabled={isRegisteringBio || !biometricsSupported}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-emerald-400 rounded-lg text-xs font-semibold border border-slate-700 transition"
                >
                  {isRegisteringBio ? 'Scanning...' : hasBiometrics ? 'Re-bind' : 'Enable'}
                </button>
              </div>

            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
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
              Save Settings
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
