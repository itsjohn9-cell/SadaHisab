import { AppSecuritySettings } from '../types';
import { db } from '../db/db';
import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';

// Convert Uint8Array to hex string
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Convert hex string to Uint8Array
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Convert Uint8Array to Base64
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert Base64 to Uint8Array
export function base64ToBytes(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// PBKDF2 PIN Hashing (100,000 iterations, SHA-256)
export async function hashPin(pin: string, existingSaltHex?: string): Promise<{ hash: string; salt: string }> {
  const enc = new TextEncoder();
  const saltBytes = existingSaltHex ? hexToBytes(existingSaltHex) : window.crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return {
    hash: bytesToHex(new Uint8Array(derivedBits)),
    salt: bytesToHex(saltBytes)
  };
}

export async function verifyPin(inputPin: string, storedHash: string, storedSalt: string): Promise<boolean> {
  const result = await hashPin(inputPin, storedSalt);
  return result.hash === storedHash;
}

// WebAuthn Biometrics: Synchronous check for API existence
export function isBiometricsAvailable(): boolean {
  return typeof window !== 'undefined' && 
         typeof window.PublicKeyCredential !== 'undefined' &&
         typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
}

// WebAuthn Biometrics: Asynchronous check for actual sensor availability
export async function checkBiometricsSupported(): Promise<boolean> {
  if (!isBiometricsAvailable()) {
    return false;
  }
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// Register Biometric Authenticator (TouchID / FaceID / Android Fingerprint)
export async function registerBiometricCredential(): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  try {
    if (!isBiometricsAvailable()) {
      return { success: false, error: 'WebAuthn platform biometrics not supported on this device/browser.' };
    }

    const available = await checkBiometricsSupported();
    if (!available) {
      return { success: false, error: 'No fingerprint, TouchID, or biometric sensor available on this device.' };
    }

    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const userId = window.crypto.getRandomValues(new Uint8Array(16));

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Sada Hisab Privacy Suite' },
        user: {
          id: userId,
          name: 'user@sadahisab.local',
          displayName: 'Sada Hisab Vault Owner'
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },  // ES256
          { type: 'public-key', alg: -257 } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        },
        timeout: 60000
      }
    }) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: 'Biometric registration cancelled.' };
    }

    const rawIdBytes = new Uint8Array(credential.rawId);
    return {
      success: true,
      credentialId: bytesToBase64(rawIdBytes)
    };
  } catch (err: any) {
    if (err?.name === 'NotAllowedError') {
      return { success: false, error: 'Biometric registration prompt was cancelled or timed out.' };
    }
    return { success: false, error: err.message || 'Failed to register biometrics.' };
  }
}

// Verify Biometric Authenticator
export async function authenticateWithBiometrics(credentialIdBase64?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const allowCredentials: PublicKeyCredentialDescriptor[] = credentialIdBase64 ? [{
      type: 'public-key',
      id: base64ToBytes(credentialIdBase64) as unknown as BufferSource
    }] : [];

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
        userVerification: 'required',
        timeout: 60000
      }
    });

    return { success: !!assertion };
  } catch (err: any) {
    if (err?.name === 'NotAllowedError') {
      return { success: false, error: 'Biometric verification cancelled.' };
    }
    return { success: false, error: err.message || 'Biometric authentication cancelled or failed.' };
  }
}

// AES-256-GCM Encrypted Backup (.khumsvault)
export interface KhumsVaultContainer {
  magic: 'KHUMSVAULT';
  version: 1;
  createdAt: string;
  kdf: {
    algorithm: 'PBKDF2';
    iterations: number;
    hash: 'SHA-256';
    salt: string; // Base64
  };
  cipher: {
    algorithm: 'AES-256-GCM';
    iv: string; // Base64
  };
  ciphertext: string; // Base64
}

export async function encryptBackupVault(payloadJson: string, passphrase: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Derive AES-256-GCM key from passphrase
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-256-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-256-GCM',
      iv: iv as unknown as BufferSource
    },
    aesKey,
    enc.encode(payloadJson)
  );

  const vault: KhumsVaultContainer = {
    magic: 'KHUMSVAULT',
    version: 1,
    createdAt: new Date().toISOString(),
    kdf: {
      algorithm: 'PBKDF2',
      iterations: 100000,
      hash: 'SHA-256',
      salt: bytesToBase64(salt)
    },
    cipher: {
      algorithm: 'AES-256-GCM',
      iv: bytesToBase64(iv)
    },
    ciphertext: bytesToBase64(new Uint8Array(encrypted))
  };

  return JSON.stringify(vault, null, 2);
}

export async function decryptBackupVault(vaultJsonString: string, passphrase: string): Promise<string> {
  const vault: KhumsVaultContainer = JSON.parse(vaultJsonString);
  if (vault.magic !== 'KHUMSVAULT' || !vault.ciphertext || !vault.kdf?.salt || !vault.cipher?.iv) {
    throw new Error('Invalid .khumsvault file format. Header or cryptographic signatures corrupted.');
  }

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const salt = base64ToBytes(vault.kdf.salt);
  const iv = base64ToBytes(vault.cipher.iv);
  const ciphertextBytes = base64ToBytes(vault.ciphertext);

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: vault.kdf.iterations || 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-256-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-256-GCM',
      iv: iv as unknown as BufferSource
    },
    aesKey,
    ciphertextBytes as unknown as BufferSource
  );

  return dec.decode(decrypted);
}

// Security Settings DB Access
export async function getSecuritySettings(): Promise<AppSecuritySettings> {
  const setting = await db.app_settings.get('security_settings');
  if (setting && setting.value) {
    return setting.value;
  }
  return {
    isAppLockEnabled: false,
    hasBiometrics: false,
    autoLockTimeoutMs: 300000 // 5 minutes
  };
}

export async function saveSecuritySettings(settings: AppSecuritySettings): Promise<void> {
  await db.app_settings.put({
    key: 'security_settings',
    value: settings
  });
}

// Backup reminder checker (14 days)
export async function checkBackupRecency(): Promise<{ daysSinceLastBackup: number; needsReminder: boolean }> {
  const setting = await db.app_settings.get('last_backup_date');
  if (!setting || !setting.value) {
    return { daysSinceLastBackup: 999, needsReminder: true };
  }

  const lastDate = new Date(setting.value).getTime();
  const diffDays = Math.floor((Date.now() - lastDate) / (1000 * 60 * 60 * 24));
  return {
    daysSinceLastBackup: diffDays,
    needsReminder: diffDays >= 14
  };
}

export async function markBackupCompleted(): Promise<void> {
  await db.app_settings.put({
    key: 'last_backup_date',
    value: new Date().toISOString()
  });
}
