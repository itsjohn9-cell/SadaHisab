import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  db, 
  initializeDatabase, 
  loadSampleData, 
  clearSampleData 
} from './db/db';
import { 
  Account, 
  Transaction, 
  FXRate, 
  KhumsSnapshot, 
  Sponsorship, 
  AppSecuritySettings 
} from './types';
import { fetchLiveFXRates } from './services/fxService';
import { 
  getSecuritySettings, 
  checkBackupRecency 
} from './services/cryptoSecurity';
import { Navbar, NavTabType } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { LedgerView } from './components/LedgerView';
import { HealerQueueView } from './components/HealerQueueView';
import { KhumsView } from './components/KhumsView';
import { SponsorshipView } from './components/SponsorshipView';
import { ImportExportView } from './components/ImportExportView';
import { TransactionModal } from './components/TransactionModal';
import { MagicInboxView } from './components/MagicInboxView';
import { MonthlyRosterView } from './components/MonthlyRosterView';
import { QuickPasteModal } from './components/QuickPasteModal';
import { ReconciliationAuditView } from './components/ReconciliationAuditView';
import { AppLockScreen } from './components/AppLockScreen';
import { SecuritySettingsModal } from './components/SecuritySettingsModal';
import { BackupReminderBanner } from './components/BackupReminderBanner';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTabType>('dashboard');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fxRates, setFxRates] = useState<FXRate[]>([]);
  const [khumsSnapshots, setKhumsSnapshots] = useState<KhumsSnapshot[]>([]);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingFX, setIsSyncingFX] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQuickPasteOpen, setIsQuickPasteOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [pastedClipboardText, setPastedClipboardText] = useState('');
  const [primaryCurrency, setPrimaryCurrency] = useState<'PKR' | 'AED'>('PKR');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Security & App Lock State
  const [securitySettings, setSecuritySettings] = useState<AppSecuritySettings>({
    isAppLockEnabled: false,
    hasBiometrics: false,
    autoLockTimeoutMs: 300000 // 5 minutes
  });
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());

  // 14-Day Backup Health Reminder state
  const [backupReminder, setBackupReminder] = useState<{ daysSinceLastBackup: number; needsReminder: boolean }>({
    daysSinceLastBackup: 0,
    needsReminder: false
  });
  const [dismissedReminder, setDismissedReminder] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch all state from Dexie IndexedDB
  const refreshAllData = useCallback(async () => {
    try {
      const [accs, txs, fx, khums, spons, sec, bRecency] = await Promise.all([
        db.accounts.toArray(),
        db.transactions.toArray(),
        db.fx_rates.toArray(),
        db.khums_snapshots.toArray(),
        db.sponsorships.toArray(),
        getSecuritySettings(),
        checkBackupRecency()
      ]);

      setAccounts(accs);
      setTransactions(txs);
      setFxRates(fx);
      setKhumsSnapshots(khums);
      setSponsorships(spons);
      setSecuritySettings(sec);
      setBackupReminder(bRecency);
    } catch (err) {
      console.error('Error refreshing local database:', err);
    }
  }, []);

  // Initial mount & URL Scheme Handler for Android Bridge (?quickAdd=...)
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await initializeDatabase();
      await refreshAllData();
      
      const sec = await getSecuritySettings();
      if (sec.isAppLockEnabled && sec.pinHash) {
        setIsLocked(true); // Lock on fresh launch if enabled
      }

      setIsLoading(false);

      // Check if URL has ?quickAdd= query parameter from MacroDroid or Android shortcut
      const urlParams = new URLSearchParams(window.location.search);
      const quickAddParam = urlParams.get('quickAdd');
      if (quickAddParam) {
        setPastedClipboardText(quickAddParam);
        setIsQuickPasteOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
    init();
  }, [refreshAllData]);

  // 5-Minute Inactivity Auto-Lock Timer
  useEffect(() => {
    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    // Inactivity interval checker every 10 seconds
    const interval = setInterval(() => {
      if (securitySettings.isAppLockEnabled && securitySettings.pinHash && !isLocked) {
        const idleTime = Date.now() - lastActivityRef.current;
        if (idleTime >= (securitySettings.autoLockTimeoutMs || 300000)) {
          setIsLocked(true);
        }
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      clearInterval(interval);
    };
  }, [securitySettings, isLocked]);

  // Global Ctrl+V / Cmd+V Anywhere in App
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (isLocked) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const pasted = e.clipboardData?.getData('text');
      if (pasted && pasted.trim().length > 5) {
        const looksLikeFinancial = /(AED|PKR|Rs|USD|\$|£|debited|credited|spent|used for|paid to|sent to|account|card|balance|otp)/i.test(pasted);
        if (looksLikeFinancial) {
          e.preventDefault();
          setPastedClipboardText(pasted.trim());
          setIsQuickPasteOpen(true);
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [isLocked]);

  // Load realistic sample data
  const handleLoadSample = async () => {
    setIsLoading(true);
    await loadSampleData();
    await refreshAllData();
    setIsLoading(false);
    showToast('Loaded realistic sample data across ADCB, Al Habib, Wise & Sponsorships.');
  };

  // Clear sample data
  const handleClearSample = async () => {
    setIsLoading(true);
    await clearSampleData();
    await refreshAllData();
    setIsLoading(false);
    showToast('Sample data cleared. Real local data preserved intact.');
  };

  // Live FX Sync
  const handleSyncFX = async () => {
    setIsSyncingFX(true);
    const res = await fetchLiveFXRates();
    await refreshAllData();
    setIsSyncingFX(false);
    showToast(res.message);
  };

  const needsReviewCount = transactions.filter(t => t.status === 'NEEDS_REVIEW').length;
  const sampleDataCount = transactions.filter(t => t.isSampleData).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center animate-pulse">
          <div className="h-6 w-6 rounded-lg bg-emerald-400" />
        </div>
        <p className="text-sm font-semibold text-slate-300">Initializing Sada Hisab Encrypted Local Database...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      
      {/* App Lock Screen Overlay */}
      {isLocked && (
        <AppLockScreen
          securitySettings={securitySettings}
          onUnlock={() => {
            setIsLocked(false);
            lastActivityRef.current = Date.now();
          }}
        />
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        needsReviewCount={needsReviewCount}
        sampleDataCount={sampleDataCount}
        onLoadSample={handleLoadSample}
        onClearSample={handleClearSample}
        onSyncFX={handleSyncFX}
        isSyncingFX={isSyncingFX}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenQuickPaste={() => {
          setPastedClipboardText('');
          setIsQuickPasteOpen(true);
        }}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        primaryCurrency={primaryCurrency}
        setPrimaryCurrency={setPrimaryCurrency}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/50 text-slate-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* 14-Day Automated Backup Health Reminder */}
        {backupReminder.needsReminder && !dismissedReminder && (
          <BackupReminderBanner
            daysSinceLastBackup={backupReminder.daysSinceLastBackup}
            onOpenBackupModal={() => setActiveTab('import-export')}
            onDismiss={() => setDismissedReminder(true)}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            accounts={accounts}
            transactions={transactions}
            fxRates={fxRates}
            khumsSnapshots={khumsSnapshots}
            sponsorships={sponsorships}
            primaryCurrency={primaryCurrency}
            onNavigateTab={setActiveTab}
            onOpenAddModal={() => setIsAddModalOpen(true)}
          />
        )}

        {activeTab === 'magic-inbox' && (
          <MagicInboxView
            accounts={accounts}
            onRefreshData={refreshAllData}
            initialPastedText={pastedClipboardText}
          />
        )}

        {activeTab === 'roster' && (
          <MonthlyRosterView
            accounts={accounts}
            onRefreshData={refreshAllData}
          />
        )}

        {/* Financial Integrity & Reconciliation Auditor */}
        {activeTab === 'reconcile' && (
          <ReconciliationAuditView
            accounts={accounts}
            transactions={transactions}
            onRefreshData={refreshAllData}
          />
        )}

        {activeTab === 'ledger' && (
          <LedgerView
            transactions={transactions}
            accounts={accounts}
            initialFilterTab="ALL"
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onRefreshData={refreshAllData}
          />
        )}

        {activeTab === 'healer' && (
          <HealerQueueView
            transactions={transactions}
            accounts={accounts}
            onRefreshData={refreshAllData}
          />
        )}

        {activeTab === 'khums' && (
          <KhumsView
            khumsSnapshots={khumsSnapshots}
            accounts={accounts}
            onRefreshData={refreshAllData}
          />
        )}

        {activeTab === 'sponsorships' && (
          <SponsorshipView
            sponsorships={sponsorships}
            accounts={accounts}
            onRefreshData={refreshAllData}
          />
        )}

        {activeTab === 'import-export' && (
          <ImportExportView
            onRefreshData={refreshAllData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 text-center text-xs text-slate-500">
        <p>Sada Hisab &bull; Zero-Trust Local-First Financial & Khums Accounting &bull; AES-256 Vault Protected</p>
      </footer>

      {/* Manual Transaction Recording Modal */}
      <TransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        accounts={accounts}
        fxRates={fxRates}
        onSuccess={refreshAllData}
      />

      {/* Global Floating Quick Paste SMS Modal (Ctrl+V) */}
      <QuickPasteModal
        isOpen={isQuickPasteOpen}
        onClose={() => setIsQuickPasteOpen(false)}
        accounts={accounts}
        initialPastedText={pastedClipboardText}
        onSuccess={refreshAllData}
      />

      {/* App Lock & Biometrics Settings Modal */}
      <SecuritySettingsModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        securitySettings={securitySettings}
        onUpdateSettings={(newSec) => {
          setSecuritySettings(newSec);
          showToast('Security settings updated successfully.');
        }}
      />

    </div>
  );
};

export default App;
