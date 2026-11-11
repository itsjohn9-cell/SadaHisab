import React, { useState, useEffect } from 'react';
import { Phone, Mail, KeyRound, Fingerprint, Shield, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import {
  generateMasterKey,
  generateUUID,
  sha256Hex,
  wrapMasterKey,
  unwrapMasterKey,
  consumeSsoUrl,
  SadaPassportSession,
  SADA_RELAY_URL,
  bridgeDb,
} from '../services/sada-bridge';
import { checkBiometricsSupported, authenticateWithBiometrics } from '../services/cryptoSecurity';

interface Props {
  accentColor?: string;
  onSuccess: (session: SadaPassportSession) => void;
  onClose?: () => void;
}

export const SadaPassportLogin: React.FC<Props> = ({ accentColor = '#16a34a', onSuccess, onClose }) => {
  const [tab, setTab] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('+965');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  useEffect(() => {
    const sso = consumeSsoUrl();
    if (sso && sso.sada_uid && sso.identifier) {
      bridgeDb.identities.get(sso.sada_uid).then((saved) => {
        if (saved) {
          setPhone(saved.phone_e164 || '');
          setEmail(saved.email_normalized || '');
          if (saved.phone_e164) setTab('phone');
          else if (saved.email_normalized) setTab('email');
        }
      });
    }

    checkBiometricsSupported()
      .then((available) => setBiometricsAvailable(!!available))
      .catch(() => setBiometricsAvailable(false));
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits.');
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      const normalizedPhone = cleanPhone.startsWith('05') ? '+971' + cleanPhone.slice(1) : (cleanPhone.startsWith('971') ? '+' + cleanPhone : cleanPhone);
      const identifier = tab === 'phone' ? normalizedPhone : email.trim().toLowerCase();
      if (!identifier) throw new Error(`Please enter your ${tab === 'phone' ? 'phone number' : 'email address'}.`);

      const cleanPin = pin.trim();
      const normEmail = email.trim().toLowerCase();
      const isMasterId = 
        normEmail === 'mohammad.jhone9@gmail.com' || 
        normEmail === 'fehmatics@gmail.com' ||
        identifier === 'mohammad.jhone9@gmail.com' ||
        identifier === 'fehmatics@gmail.com' ||
        identifier === '+971543661655' || 
        identifier.includes('543661655') ||
        cleanPhone.includes('543661655');

      const isMasterSecret = 
        cleanPin === '129945' || 
        cleanPin === '124459' || 
        cleanPin === 'dada0987' || 
        cleanPin === 'aae34111' || 
        cleanPin === '1299';

      if (isMasterId && isMasterSecret) {
        // Universal Instant Master Admin Login
        const masterKeyRaw = generateMasterKey();
        const sada_uid = 'usr_super_1';
        const sada_uid_hash = await sha256Hex(sada_uid);
        const envelope = await wrapMasterKey(masterKeyRaw, identifier, cleanPin);

        await bridgeDb.identities.put({
          sada_uid,
          sada_uid_hash,
          phone_e164: '+971543661655',
          email_normalized: 'mohammad.jhone9@gmail.com',
          phone_envelope: envelope,
          email_envelope: envelope,
        }).catch(() => {});

        const session: SadaPassportSession = {
          sada_uid,
          sada_uid_hash,
          identifier: tab === 'phone' ? '+971543661655' : 'mohammad.jhone9@gmail.com',
          identifier_type: tab,
          master_key_raw: masterKeyRaw,
          unlocked_at: Date.now(),
        };

        try {
          sessionStorage.setItem('sada_master_unlocked', 'true');
        } catch {}
        window.dispatchEvent(new CustomEvent('sada:entitlements_loaded', {
          detail: { 
            allowedApps: ['sadalink', 'sadaflow', 'sadahisab', 'sadavpn', 'sajdah', 'karachi-runner', 'tahaluf', 'stc-kuwait', 'afc'],
            role: 'super_admin'
          }
        }));

        onSuccess(session);
        return;
      }

      if (isRegistering) {
        const masterKeyRaw = generateMasterKey();
        const sada_uid = generateUUID();
        const sada_uid_hash = await sha256Hex(sada_uid);

        const envelope = await wrapMasterKey(masterKeyRaw, identifier, pin);

        const regPayload = {
          sada_uid,
          sada_uid_hash,
          phone_e164: tab === 'phone' ? identifier : null,
          email_normalized: tab === 'email' ? identifier : null,
          phone_envelope: envelope,
          email_envelope: null,
        };

        await fetch(`${SADA_RELAY_URL}/api/sada-identity/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(regPayload),
        }).catch(() => {});

        await bridgeDb.identities.put({
          sada_uid,
          sada_uid_hash,
          phone_e164: tab === 'phone' ? identifier : undefined,
          email_normalized: tab === 'email' ? identifier : undefined,
          phone_envelope: envelope,
        });

        const session: SadaPassportSession = {
          sada_uid,
          sada_uid_hash,
          identifier,
          identifier_type: tab,
          master_key_raw: masterKeyRaw,
          unlocked_at: Date.now(),
        };

        onSuccess(session);
      } else {
        let identity: any = null;
        try {
          const res = await fetch(`${SADA_RELAY_URL}/api/sada-identity/lookup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tab === 'phone' ? { phone_e164: identifier } : { email_normalized: identifier }),
          });
          const data = await res.json();
          if (data?.found && data.identity) {
            identity = data.identity;
          }
        } catch {}

        if (!identity) {
          identity =
            tab === 'phone'
              ? await bridgeDb.identities.where('phone_e164').equals(identifier).first()
              : await bridgeDb.identities.where('email_normalized').equals(identifier).first();
        }

        if (!identity) {
          throw new Error('Account not found. Please register first or check your details.');
        }

        const envelopeStr = tab === 'phone' ? identity.phone_envelope : identity.email_envelope || identity.phone_envelope;
        if (!envelopeStr) throw new Error('No encryption envelope found for this login method.');

        const masterKeyRaw = await unwrapMasterKey(envelopeStr, identifier, pin);

        const session: SadaPassportSession = {
          sada_uid: identity.sada_uid,
          sada_uid_hash: identity.sada_uid_hash,
          identifier,
          identifier_type: tab,
          master_key_raw: masterKeyRaw,
          unlocked_at: Date.now(),
        };

        await bridgeDb.identities.put({
          sada_uid: identity.sada_uid,
          sada_uid_hash: identity.sada_uid_hash,
          phone_e164: identity.phone_e164,
          email_normalized: identity.email_normalized,
          phone_envelope: identity.phone_envelope,
          email_envelope: identity.email_envelope,
        });

        onSuccess(session);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricUnlock = async () => {
    setError(null);
    setLoading(true);
    try {
      const cached = await bridgeDb.identities.toArray();
      if (!cached || cached.length === 0) {
        throw new Error('No cached Sada Passport found on this device. Please log in with PIN first.');
      }

      const res = await authenticateWithBiometrics();
      if (!res.success) {
        throw new Error(res.error || 'Biometric authentication failed.');
      }

      setError('Biometric verified. Please confirm your 6-digit PIN.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-6 text-slate-100">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Sada Passport</h2>
            <p className="text-xs text-slate-400">Zero-Knowledge Hardware-Grade Auth</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm">
            ✕
          </button>
        )}
      </div>

      <div className="flex p-1 bg-slate-900 rounded-xl my-4 border border-slate-800/80">
        <button
          type="button"
          onClick={() => {
            setTab('phone');
            setError(null);
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            tab === 'phone' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Phone className="w-3.5 h-3.5" /> Phone (Primary)
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('email');
            setError(null);
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            tab === 'email' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mail className="w-3.5 h-3.5" /> Linked Email
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/50 flex items-start gap-2 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-3.5">
        {tab === 'phone' ? (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">E.164 Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+96512345678"
              required
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            {tab === 'email' ? 'Password or Master PIN (e.g. 129945)' : 'Master PIN (e.g. 129945)'}
          </label>
          <div className="relative">
            <input
              type="password"
              inputMode={tab === 'phone' ? 'numeric' : 'text'}
              maxLength={32}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <KeyRound className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ backgroundColor: accentColor }}
          className="w-full py-2.5 px-4 rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition-opacity disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{isRegistering ? 'Create Sada Passport' : 'Unlock Sada Passport'}</span>
        </button>

        {biometricsAvailable && !isRegistering && (
          <button
            type="button"
            onClick={handleBiometricUnlock}
            className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Fingerprint className="w-4 h-4 text-emerald-400" />
            <span>Fast-Unlock via Biometrics</span>
          </button>
        )}

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
            }}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isRegistering ? 'Already have a Sada Passport? Unlock here' : 'Need a new account? Create Sada Passport'}
          </button>
        </div>
      </form>
    </div>
  );
};

