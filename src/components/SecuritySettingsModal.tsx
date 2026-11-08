import React, { useState, useEffect } from 'react';
import { 
  AppSecuritySettings 
} from '../types';
import { 
  hashPin, 
  verifyPin,
  registerBiometricCredential, 
  checkBiometricsSupported,
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
  Clock,
  ShieldAlert
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
  const [currentPin, setCurrentPin] = useState<string>('');
  const [pinLength, setPinLength] = useState<number>(securitySettings.pinLength || 4);
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [timeoutMs, setTimeoutMs] = useState<number>(securitySettings.autoLockTimeoutMs || 300000);
  const [hasBiometrics, setHasBiometrics] = useState<boolean>(securitySettings.hasBiometrics);
  const [credentialId, setCredentialId] = useState<string | undefined>(securitySettings.biometricCredentialId);
  const [biometricsSupported, setBiometricsSupported] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isRegisteringBio, setIsRegisteringBio] = useState<boolean>(false);

  // Check biometric sensor support on open
  useEffect(() => {
    if (isOpen) {
      setCurrentPin('');
      setPin('');
      setConfirmPin('');
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsEnabled(securitySettings.isAppLockEnabled);
      setHasBiometrics(securitySettings.hasBiometrics);
      setCredentialId(securitySettings.biometricCredentialId);
      setPinLength(securitySettings.pinLength || 4);

      checkBiometricsSupported()
        .then(supported => setBiometricsSupported(supported))
        .catch(() => setBiometricsSupported(false));
    }
  }, [isOpen, securitySettings]);

  const handleRegisterBiometrics = async () => {
    setIsRegisteringBio(true);
    setErrorMsg(null);
    const res = await registerBiometricCredential();
    setIsRegisteringBio(false);

    if (res.success && res.credentialId) {
      setHasBiometrics(true);
      setCredentialId(res.credentialId);
      setSuccessMsg('Biometric authentication registered and enabled!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(res.error || 'Failed to register biometrics.');
    }
  };

  const handleToggleBiometrics = async (checked: boolean) => {
    if (checked) {
      await handleRegisterBiometrics();
    } else {
      // Disabling biometrics requires current PIN if PIN is set
      if (securitySettings.pinHash) {
        if (!currentPin) {
          setErrorMsg('Please enter your Current PIN above to disable biometrics.');
          return;
        }
        const isCurrentValid = await verifyPin(currentPin, securitySettings.pinHash, securitySettings.pinSalt || '');
        if (!isCurrentValid) {
          setErrorMsg('Current PIN is incorrect. Cannot disable biometrics.');
          return;
        }
      }
      setHasBiometrics(false);
      setCredentialId(undefined);
      setSuccessMsg('Biometrics disabled.');
      setTimeout(() => setSuccessMsg(null), 2500);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let updatedHash = securitySettings.pinHash;
    let updatedSalt = securitySettings.pinSalt;
    let updatedLength = securitySettings.pinLength || pinLength;

    const hasExistingPin = !!securitySettings.pinHash;

    // 1. If disabling App Lock, require Current PIN
    if (!isEnabled && securitySettings.isAppLockEnabled && hasExistingPin) {
      if (!currentPin) {
        setErrorMsg('Please enter your Current PIN to disable App Lock.');
        return;
      }
      const isCurrentValid = await verifyPin(currentPin, securitySettings.pinHash!, securitySettings.pinSalt || '');
      if (!isCurrentValid) {
        setErrorMsg('Current PIN is incorrect. Cannot disable App Lock.');
        return;
      }
    }

    // 2. If updating PIN or setting a new PIN
    if (isEnabled) {
      if (pin) {
        // Changing PIN requires Current PIN if one was already set
        if (hasExistingPin) {
          if (!currentPin) {
            setErrorMsg('Please enter your Current Master PIN to authorize setting a new PIN.');
            return;
          }
          const isCurrentValid = await verifyPin(currentPin, securitySettings.pinHash!, securitySettings.pinSalt || '');
          if (!isCurrentValid) {
            setErrorMsg('Current Master PIN is incorrect.');
            return;
          }
        }

        if (pin.length !== pinLength) {
          setErrorMsg(`New PIN must be exactly ${pinLength} digits.`);
          return;
        }
        if (pin !== confirmPin) {
          setErrorMsg('PIN confirmation does not match.');
          return;
        }
        const { hash, salt } = await hashPin(pin);
        updatedHash = hash;
        updatedSalt = salt;
        updatedLength = pinLength;
      } else if (!updatedHash) {
        setErrorMsg(`Please enter a ${pinLength}-digit PIN to enable App Lock.`);
        return;
      }
    }

    const newSettings: AppSecuritySettings = {
      isAppLockEnabled: isEnabled,
      pinHash: updatedHash,
      pinSalt: updatedSalt,
      pinLength: updatedLength,
      hasBiometrics,
      biometricCredentialId: credentialId,
      autoLockTimeoutMs: timeoutMs,
      lastBackupDate: securitySettings.lastBackupDate,
      geminiApiKey: securitySettings.geminiApiKey,
      customKhumsCutoffMonthDay: securitySettings.customKhumsCutoffMonthDay,
      targetDonationPercentage: securitySettings.targetDonationPercentage,
      googleDriveClientId: securitySettings.googleDriveClientId,
      googleDriveAccessToken: securitySettings.googleDriveAccessToken,
      googleDriveAutoSync: securitySettings.googleDriveAutoSync,
      googleDriveLastSync: securitySettings.googleDriveLastSync
    };

    await saveSecuritySettings(newSettings);
    onUpdateSettings(newSettings);
    setSuccessMsg('Security settings saved successfully.');
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  const hasExistingPin = !!securitySettings.pinHash;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              App Lock & Biometric Security
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span className="leading-tight">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="leading-tight">{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Toggle App Lock */}
          <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl">
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

          {/* Current Master PIN (Mandatory when PIN exists to authorize modifications) */}
          {hasExistingPin && (
            <div className="bg-slate-950/90 border border-amber-500/30 p-3.5 rounded-2xl space-y-1.5 animate-in fade-in">
              <label className="text-xs font-semibold text-amber-300 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                  <span>Current Master PIN</span>
                </span>
                <span className="text-[10px] text-amber-400/80 font-normal">Required for security</span>
              </label>
              <input
                type="password"
                maxLength={6}
                placeholder="Enter current PIN"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-mono tracking-widest text-center focus:border-amber-400 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400">
                Verifies authorization before allowing PIN replacement or disabling security.
              </p>
            </div>
          )}

          {isEnabled && (
            <div className="space-y-4 pt-1 animate-in fade-in">
              
              {/* PIN Length Selection */}
              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-emerald-400" />
                    <span>PIN Length</span>
                  </label>
                  <div className="inline-flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg text-xs space-x-1">
                    <button
                      type="button"
                      onClick={() => { setPinLength(4); setPin(''); setConfirmPin(''); }}
                      className={`px-2.5 py-1 rounded font-medium transition ${
                        pinLength === 4
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      4 Digits
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPinLength(6); setPin(''); setConfirmPin(''); }}
                      className={`px-2.5 py-1 rounded font-medium transition ${
                        pinLength === 6
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      6 Digits
                    </button>
                  </div>
                </div>

                {/* PIN Inputs */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      {hasExistingPin ? 'New PIN (Optional)' : `Set ${pinLength}-Digit PIN`}
                    </label>
                    <input
                      type="password"
                      maxLength={pinLength}
                      placeholder={pinLength === 6 ? '••••••' : '••••'}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white font-mono tracking-widest text-center focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Confirm PIN</label>
                    <input
                      type="password"
                      maxLength={pinLength}
                      placeholder={pinLength === 6 ? '••••••' : '••••'}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white font-mono tracking-widest text-center focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
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
                  className="w-full mt-1.5 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value={60000}>1 minute</option>
                  <option value={300000}>5 minutes (Recommended)</option>
                  <option value={900000}>15 minutes</option>
                  <option value={1800000}>30 minutes</option>
                </select>
              </div>

              {/* Biometrics Toggle & Management */}
              <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Fingerprint className="h-5 w-5 text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-white">TouchID / Biometric Unlock</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {hasBiometrics 
                          ? 'Active — unlock instantly with fingerprint or face' 
                          : biometricsSupported 
                            ? 'Device sensor ready — toggle on to enable instant unlock' 
                            : 'No enrolled biometric detected in device settings'}
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer ml-3">
                    <input
                      type="checkbox"
                      checked={hasBiometrics}
                      onChange={(e) => handleToggleBiometrics(e.target.checked)}
                      disabled={isRegisteringBio}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-disabled:opacity-50" />
                  </label>
                </div>

                {hasBiometrics && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-emerald-400 flex items-center space-x-1">
                      <Check className="h-3 w-3" />
                      <span>Biometric credential active</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleRegisterBiometrics}
                      disabled={isRegisteringBio}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
                    >
                      {isRegisteringBio ? 'Scanning...' : 'Re-register Sensor'}
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95"
            >
              Save Security Settings
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
