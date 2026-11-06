import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { db, recalculateAllAccountBalances } from '../db/db';
import { 
  TimeMachineSnapshot, 
  BankingAppPackage, 
  Currency, 
  Transaction, 
  Account, 
  KhumsSnapshot 
} from '../types';

// Package whitelist for hands-free finance notification ingestion
export const DEFAULT_BANKING_WHITELIST: BankingAppPackage[] = [
  // UAE
  { packageName: 'com.adcb.bank', appName: 'ADCB Mobile', region: 'UAE', currency: 'AED', isWhitelisted: true, sampleSender: 'ADCB' },
  { packageName: 'com.mashreq.neo', appName: 'Mashreq Neo', region: 'UAE', currency: 'AED', isWhitelisted: true, sampleSender: 'Mashreq' },
  { packageName: 'com.google.android.apps.walletnfcrel', appName: 'Google Wallet', region: 'GLOBAL', currency: 'AED', isWhitelisted: true, sampleSender: 'Google Pay' },
  { packageName: 'com.samsung.android.spay', appName: 'Samsung Wallet', region: 'GLOBAL', currency: 'AED', isWhitelisted: true, sampleSender: 'Samsung Pay' },
  
  // Pakistan
  { packageName: 'com.bahl.mobilebanking', appName: 'Bank AL Habib', region: 'PK', currency: 'PKR', isWhitelisted: true, sampleSender: 'AL Habib' },
  { packageName: 'com.sc.mobilebanking.pk', appName: 'Standard Chartered PK', region: 'PK', currency: 'PKR', isWhitelisted: true, sampleSender: 'SCB' },
  { packageName: 'com.nayapay.app', appName: 'NayaPay', region: 'PK', currency: 'PKR', isWhitelisted: true, sampleSender: 'NayaPay' },
  { packageName: 'pk.com.telenor.phoenix', appName: 'Easypaisa', region: 'PK', currency: 'PKR', isWhitelisted: true, sampleSender: 'Easypaisa' },
  { packageName: 'com.techlogix.mobilinkcustomer', appName: 'JazzCash', region: 'PK', currency: 'PKR', isWhitelisted: true, sampleSender: 'JazzCash' },
  { packageName: 'com.hbl.android.hblmobilebanking', appName: 'HBL Mobile', region: 'PK', currency: 'PKR', isWhitelisted: true, sampleSender: 'HBL' },

  // International
  { packageName: 'com.transferwise.android', appName: 'Wise', region: 'INTL', currency: 'USD', isWhitelisted: true, sampleSender: 'Wise' },
  { packageName: 'com.paypal.android.p2pmobile', appName: 'PayPal', region: 'INTL', currency: 'USD', isWhitelisted: true, sampleSender: 'PayPal' }
];

export interface PlatformDiagnostics {
  platform: 'android' | 'ios' | 'web';
  isNative: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isPWA: boolean;
  storagePersisted: boolean;
  documentsDirectorySupported: boolean;
  notificationsSupported: boolean;
}

class PlatformBridgeService {
  private isStoragePersisted = false;

  // 1. Detection
  public isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  public getPlatformName(): 'android' | 'ios' | 'web' {
    const p = Capacitor.getPlatform();
    if (p === 'android' || p === 'ios') return p;
    return 'web';
  }

  public isPWA(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  }

  // Diagnostics summary
  public async getDiagnostics(): Promise<PlatformDiagnostics> {
    const isNat = this.isNative();
    const plat = this.getPlatformName();
    let persisted = false;

    if (navigator.storage && navigator.storage.persisted) {
      persisted = await navigator.storage.persisted();
    }

    return {
      platform: plat,
      isNative: isNat,
      isAndroid: plat === 'android',
      isIOS: plat === 'ios',
      isPWA: this.isPWA(),
      storagePersisted: persisted || this.isStoragePersisted,
      documentsDirectorySupported: isNat,
      notificationsSupported: 'Notification' in window || isNat
    };
  }

  // 2. Request Persistent Storage on Web/PWA
  public async requestPersistentStorage(): Promise<boolean> {
    if (navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persist();
        this.isStoragePersisted = isPersisted;
        console.log(`[PlatformBridge] Persistent storage granted: ${isPersisted}`);
        return isPersisted;
      } catch (e) {
        console.warn('[PlatformBridge] navigator.storage.persist failed:', e);
      }
    }
    return false;
  }

  // 3. Native Android Documents Mirror (Survives APK reinstall)
  public async mirrorBackupToNativeFilesystem(
    filename: string,
    content: string
  ): Promise<string | null> {
    if (!this.isNative()) return null;

    try {
      // Create subfolder SadaCash_Backups inside Documents directory
      const dirPath = 'SadaCash_Backups';
      try {
        await Filesystem.mkdir({
          path: dirPath,
          directory: Directory.Documents,
          recursive: true
        });
      } catch {
        // Folder already exists
      }

      const fullPath = `${dirPath}/${filename}`;
      const res = await Filesystem.writeFile({
        path: fullPath,
        data: content,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      console.log(`[PlatformBridge] Native backup mirrored to Documents: ${res.uri}`);
      return res.uri;
    } catch (err) {
      console.warn('[PlatformBridge] Native mirror to Documents failed:', err);
      return null;
    }
  }

  // 4. Rolling 10-Snapshot Time Machine
  public async createTimeMachineSnapshot(
    label: string,
    triggerType: 'EXCEL_IMPORT' | 'ROSTER_BATCH' | 'DELETE' | 'MANUAL' = 'MANUAL'
  ): Promise<TimeMachineSnapshot> {
    const [accounts, transactions, snapshots] = await Promise.all([
      db.accounts.toArray(),
      db.transactions.toArray(),
      db.khums_snapshots.toArray()
    ]);

    const payload = {
      accounts,
      transactions,
      snapshots,
      createdAt: new Date().toISOString()
    };

    const snapshotRecord: TimeMachineSnapshot = {
      id: `tm-${Date.now()}`,
      timestamp: new Date().toISOString(),
      label,
      triggerType,
      dataJSON: JSON.stringify(payload),
      transactionsCount: transactions.length,
      accountsCount: accounts.length
    };

    // Save snapshot
    await db.time_machine_snapshots.add(snapshotRecord);

    // Evict oldest if count > 10 (Rolling 10 limit)
    const allSnapshots = await db.time_machine_snapshots
      .orderBy('timestamp')
      .reverse()
      .toArray();

    if (allSnapshots.length > 10) {
      const surplus = allSnapshots.slice(10);
      const surplusIds = surplus.map(s => s.id);
      await db.time_machine_snapshots.bulkDelete(surplusIds);
    }

    // Mirror to native Documents if on Android
    if (this.isNative()) {
      await this.mirrorBackupToNativeFilesystem(
        `TimeMachine_${snapshotRecord.id}.json`,
        snapshotRecord.dataJSON
      );
    }

    return snapshotRecord;
  }

  public async getTimeMachineSnapshots(): Promise<TimeMachineSnapshot[]> {
    return db.time_machine_snapshots
      .orderBy('timestamp')
      .reverse()
      .toArray();
  }

  public async restoreTimeMachineSnapshot(snapshotId: string): Promise<boolean> {
    const snapshot = await db.time_machine_snapshots.get(snapshotId);
    if (!snapshot) return false;

    try {
      const data = JSON.parse(snapshot.dataJSON);
      if (!data || !Array.isArray(data.transactions) || !Array.isArray(data.accounts)) {
        throw new Error('Invalid snapshot payload format');
      }

      // Clear current volatile stores
      await db.transactions.clear();
      await db.accounts.clear();

      // Bulk restore
      await db.accounts.bulkAdd(data.accounts);
      await db.transactions.bulkAdd(data.transactions);

      if (Array.isArray(data.snapshots) && data.snapshots.length > 0) {
        await db.khums_snapshots.clear();
        await db.khums_snapshots.bulkAdd(data.snapshots);
      }

      // Recalculate ledger balances
      await recalculateAllAccountBalances();
      return true;
    } catch (err) {
      console.error('[PlatformBridge] Failed to restore Time Machine snapshot:', err);
      return false;
    }
  }

  public async deleteTimeMachineSnapshot(snapshotId: string): Promise<void> {
    await db.time_machine_snapshots.delete(snapshotId);
  }

  // 5. Deep Link & Intent Ingestion Listener (Samsung Routines / MacroDroid)
  public setupDeepLinkListener(
    onIngest: (payload: { text: string; source?: string }) => void
  ): void {
    // Native Capacitor App URL open listener
    if (this.isNative()) {
      App.addListener('appUrlOpen', (event) => {
        try {
          const url = new URL(event.url);
          // sadacash://ingest?payload=... or sadacash://ingest?text=...
          if (url.protocol.startsWith('sadacash')) {
            const textParam = url.searchParams.get('payload') || url.searchParams.get('text');
            const sourceParam = url.searchParams.get('source') || 'Samsung_Routine';
            if (textParam) {
              onIngest({ text: decodeURIComponent(textParam), source: sourceParam });
            }
          }
        } catch (e) {
          console.warn('[PlatformBridge] Error parsing deep link intent URL:', e);
        }
      });
    }

    // Web / PWA query parameter listener (/?action=share&text=... or shortcuts)
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const textParam = params.get('text') || params.get('payload');
      const actionParam = params.get('action');

      if (textParam) {
        onIngest({ text: decodeURIComponent(textParam), source: 'PWA_Share_Target' });
      } else if (actionParam === 'paste') {
        // Quick Paste action requested via PWA icon shortcut
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('sadacash-shortcut-action', { detail: { action: 'paste' } }));
        }, 300);
      } else if (actionParam === 'voice') {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('sadacash-shortcut-action', { detail: { action: 'voice' } }));
        }, 300);
      } else if (actionParam === 'roster') {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('sadacash-shortcut-action', { detail: { action: 'roster' } }));
        }, 300);
      } else if (actionParam === 'scan') {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('sadacash-shortcut-action', { detail: { action: 'scan' } }));
        }, 300);
      }
    }
  }

  // 6. 3-Layer Persistent Reminders (Native Android Exact Alarms + Web Fallback)
  public async schedulePersistentReminders(): Promise<boolean> {
    if (this.isNative()) {
      try {
        const perm = await LocalNotifications.requestPermissions();
        if (perm.display !== 'granted') {
          console.warn('[PlatformBridge] Native notification permissions not granted');
          return false;
        }

        // Cancel existing scheduled notifications
        await LocalNotifications.cancel({
          notifications: [
            { id: 101 },
            { id: 102 },
            { id: 103 },
            { id: 104 }
          ]
        });

        // Current time reference
        const now = new Date();
        const year = now.getFullYear();

        // 1st of next month 09:00 AM
        const nextMonth1st = new Date(year, now.getMonth() + 1, 1, 9, 0, 0);
        // 5th of next month 10:00 AM
        const nextMonth5th = new Date(year, now.getMonth() + 1, 5, 10, 0, 0);
        // Nov 25 09:00 AM
        const nov25 = new Date(year, 10, 25, 9, 0, 0); // Month 10 = Nov
        // Nov 30 09:00 AM
        const nov30 = new Date(year, 10, 30, 9, 0, 0);

        await LocalNotifications.schedule({
          notifications: [
            {
              id: 101,
              title: '⚡ Sada Cash: Monthly Sponsorship & Bill Roster Ready',
              body: 'Review & 1-click commit Green Island, Asghar Van, Maulana Qalbe Ali & UAE Utilities.',
              schedule: { at: nextMonth1st },
              sound: 'beep.wav',
              actionTypeId: 'ROSTER_ACTIONS',
              extra: { route: 'roster' }
            },
            {
              id: 102,
              title: '📋 Sada Cash: Education & Allowance Due Reminder',
              body: 'Verify bank balances and check pending payments for students and monthly support.',
              schedule: { at: nextMonth5th },
              sound: 'beep.wav',
              actionTypeId: 'REMINDER_ACTIONS',
              extra: { route: 'reminders' }
            },
            {
              id: 103,
              title: '⚖️ Sada Cash: Annual Khums Cut-off Approaching (Nov 25)',
              body: '5 days until Nov 30 Annual Khums fiscal closing. Review loan receivables & pantry surplus.',
              schedule: { at: nov25 },
              sound: 'beep.wav',
              extra: { route: 'khums' }
            },
            {
              id: 104,
              title: '🌟 Sada Cash: Annual Khums Calculation Day (Nov 30)',
              body: 'Official Khums year-end cut-off. Perform purified capital calculation and lock snapshot.',
              schedule: { at: nov30 },
              sound: 'beep.wav',
              extra: { route: 'khums' }
            }
          ]
        });

        console.log('[PlatformBridge] Native Android exact alarm reminders scheduled successfully');
        return true;
      } catch (err) {
        console.warn('[PlatformBridge] Failed to schedule native local notifications:', err);
        return false;
      }
    }

    // Web Notification Fallback
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    }

    return false;
  }

  // 7. Native Share & Export
  public async shareFinancialDocument(
    title: string,
    text: string,
    url?: string
  ): Promise<boolean> {
    if (this.isNative()) {
      try {
        await Share.share({
          title,
          text,
          url,
          dialogTitle: 'Share with Sada Cash'
        });
        return true;
      } catch {
        // User cancelled or failed
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return true;
      } catch {
        // User cancelled
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(`${title}\n${text}${url ? `\n${url}` : ''}`);
      alert('Copied details to clipboard!');
      return true;
    } catch {
      return false;
    }
  }

  // 8. Whitelisted Banking Packages
  public getWhitelistedPackages(): BankingAppPackage[] {
    return DEFAULT_BANKING_WHITELIST;
  }

  public isPackageWhitelisted(pkgName: string): boolean {
    return DEFAULT_BANKING_WHITELIST.some(
      b => b.isWhitelisted && b.packageName.toLowerCase() === pkgName.toLowerCase()
    );
  }
}

export const platformBridge = new PlatformBridgeService();
