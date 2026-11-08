import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  AppSecuritySettings,
  FXValuationMode
} from './types';
import { 
  fetchLiveFXRates, 
  getFXValuationMode, 
  setFXValuationMode 
} from './services/fxService';
import { 
  getSecuritySettings, 
  saveSecuritySettings,
  checkBackupRecency 
} from './services/cryptoSecurity';
import { Navbar, NavTabType } from './components/Navbar';
import { startLiveBridgeListener, broadcastBudgetSnapshot, broadcastFXRates } from './services/liveBridgeSync';
import { parseSsoHashOnBoot, getActivePassportSession } from './services/sada-bridge';
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
import { PrivacyRevealModal } from './components/PrivacyRevealModal';
import { SecuritySettingsModal } from './components/SecuritySettingsModal';
import { BackupReminderBanner } from './components/BackupReminderBanner';
import { PlannedRemindersView } from './components/PlannedRemindersView';
import { AdvancedReportsView } from './components/AdvancedReportsView';
import { LoansLedgerView } from './components/LoansLedgerView';
import { BillScannerModal } from './components/BillScannerModal';
import { VoiceLoggerModal } from './components/VoiceLoggerModal';
import { CoordinatorManagerView } from './components/CoordinatorManagerView';
import { NoCodeStudioView } from './components/NoCodeStudioView';
import { GlobalControlBar, GlobalFilterState } from './components/GlobalControlBar';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import { platformBridge } from './services/platformBridge';
import { Mic } from 'lucide-react';

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
  const [isBillScannerOpen, setIsBillScannerOpen] = useState(false);
  const [isVoiceLoggerOpen, setIsVoiceLoggerOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isGoogleSheetModalOpen, setIsGoogleSheetModalOpen] = useState(false);
  const [pastedClipboardText, setPastedClipboardText] = useState('');
  const [primaryCurrency, setPrimaryCurrency] = useState<'PKR' | 'AED' | 'USD'>('PKR');
  const [globalFilters, setGlobalFilters] = useState<GlobalFilterState>({
    currency: 'PKR',
    year: 'ALL',
    region: 'ALL'
  });
  const [fxValuationMode, setFxModeState] = useState<FXValuationMode>(getFXValuationMode);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Security & App Lock State (Default Locked on App Launch)
  const [securitySettings, setSecuritySettings] = useState<AppSecuritySettings>({
    isAppLockEnabled: false,
    hasBiometrics: false,
    autoLockTimeoutMs: 300000 // 5 minutes
  });
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [isPrivacyRevealModalOpen, setIsPrivacyRevealModalOpen] = useState<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());

  // 14-Day Backup Health Reminder state
  const [backupReminder, setBackupReminder] = useState<{ daysSinceLastBackup: number; needsReminder: boolean }>({
    daysSinceLastBackup: 0,
    needsReminder: false
  });
  const [dismissedReminder, setDismissedReminder] = useState<boolean>(false);

  // Discreet Privacy Mode State (Default Masked on App Launch to prevent shoulder-surfing)
  const [isPrivacyMasked, setIsPrivacyMasked] = useState<boolean>(true);

  // Toggle Discreet Privacy Mode with Security Check on Reveal
  const handleTogglePrivacyMask = () => {
    if (isPrivacyMasked) {
      if (securitySettings.pinHash || securitySettings.hasBiometrics) {
        setIsPrivacyRevealModalOpen(true);
      } else {
        setIsPrivacyMasked(false);
        showToast('Confidential metrics revealed.');
      }
    } else {
      setIsPrivacyMasked(true);
      showToast('Discreet Privacy Mode active: metrics masked.');
    }
  };

  // Global Keyboard Shortcut: Ctrl+B / Cmd+B for Privacy Blur
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleTogglePrivacyMask();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPrivacyMasked, securitySettings]);

  // Multi-Platform Bridge Initializer (Offline Storage, Deep Links, Native Alarms)
  useEffect(() => {
    platformBridge.requestPersistentStorage();

    platformBridge.setupDeepLinkListener(({ text, source }) => {
      setPastedClipboardText(text);
      setIsQuickPasteOpen(true);
      showToast(`Pushed from ${source || 'Android Intent'}!`);
    });

    platformBridge.schedulePersistentReminders();

    // Boot: Parse SSO hash first and restore session BEFORE starting bridge listener
    let stopBridge: (() => void) | null = null;
    (async () => {
      const sso = await parseSsoHashOnBoot();
      const session = sso || getActivePassportSession();
      if (session && session.sada_uid_hash && session.master_key_raw) {
        stopBridge = startLiveBridgeListener(session.sada_uid_hash, session.master_key_raw);
        showToast('Connected to Sada Suite Ecosystem');
      }
    })();

    const handleShortcutAction = (e: any) => {
      const act = e.detail?.action;
      if (act === 'paste') setIsQuickPasteOpen(true);
      else if (act === 'voice') setIsVoiceLoggerOpen(true);
      else if (act === 'scan') setIsBillScannerOpen(true);
      else if (act === 'roster') setActiveTab('roster');
    };
    window.addEventListener('sadacash-shortcut-action', handleShortcutAction);
    return () => {
      if (stopBridge) stopBridge();
      window.removeEventListener('sadacash-shortcut-action', handleShortcutAction);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleFXModeChange = (mode: FXValuationMode) => {
    setFXValuationMode(mode);
    setFxModeState(mode);
    refreshAllData();
    showToast(`FX Mode Switched: ${
      mode === 'CONSERVATIVE_SPREAD' 
        ? 'Conservative (Live - 1 PKR Spread)' 
        : mode === 'LIVE_MID_MARKET' 
        ? 'Live Mid-Market' 
        : 'Fixed Snapshot (Income tab)'
    }`);
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

      // Sada Suite: Broadcast budget snapshot to SadaFlow
      const totalBalancePKR = accs.reduce((sum, a) => sum + (a.currency === 'PKR' ? a.currentBalance : 0), 0);
      const totalAED = accs.filter(a => a.currency === 'AED').reduce((sum, a) => sum + a.currentBalance, 0);
      const totalUSD = accs.filter(a => a.currency === 'USD').reduce((sum, a) => sum + a.currentBalance, 0);
      void broadcastBudgetSnapshot({
        totalBalancePKR,
        totalAED,
        totalUSD,
        accountsCount: accs.length,
      });
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
      setSecuritySettings(sec);
      // Always require authentication on launch
      setIsLocked(true);

      setIsLoading(false);

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

    const interval = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      // Auto-remask confidential metrics after 2 minutes of inactivity
      if (!isPrivacyMasked && idleTime >= 120000) {
        setIsPrivacyMasked(true);
      }
      // Auto-lock entire app after configured timeout (default 5 mins)
      if (!isLocked) {
        if (idleTime >= (securitySettings.autoLockTimeoutMs || 300000)) {
          setIsLocked(true);
          setIsPrivacyMasked(true);
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

    // Broadcast live FX rates across Sada Suite
    const ratesMap: Record<string, number> = {};
    const fxList = await db.fx_rates.toArray();
    fxList.forEach(r => { ratesMap[r.currency] = r.effectiveRate || r.liveRate; });
    void broadcastFXRates(ratesMap);
  };

  // Global Filters application
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (globalFilters.year !== 'ALL' && t.date && !t.date.startsWith(globalFilters.year)) {
        return false;
      }
      return true;
    });
  }, [transactions, globalFilters.year]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      if (globalFilters.region === 'PK') return acc.currency === 'PKR' && !acc.isCustodial;
      if (globalFilters.region === 'AE') return acc.currency === 'AED';
      if (globalFilters.region === 'INTL') return ['USD', 'GBP', 'SAR', 'MYR', 'IQD'].includes(acc.currency);
      if (globalFilters.region === 'CUSTODIAL') return acc.isCustodial;
      return true;
    });
  }, [accounts, globalFilters.region]);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white relative">
      
      {/* App Lock Screen Overlay */}
      {isLocked && (
        <AppLockScreen
          securitySettings={securitySettings}
          onUnlock={() => {
            setIsLocked(false);
            lastActivityRef.current = Date.now();
            showToast('Vault unlocked.');
          }}
          onSaveSecuritySettings={async (updated) => {
            await saveSecuritySettings(updated);
            setSecuritySettings(updated);
          }}
        />
      )}

      {/* Privacy Reveal Verification Modal */}
      <PrivacyRevealModal
        isOpen={isPrivacyRevealModalOpen}
        onClose={() => setIsPrivacyRevealModalOpen(false)}
        onSuccess={() => {
          setIsPrivacyMasked(false);
          lastActivityRef.current = Date.now();
          showToast('Identity verified. Confidential balances revealed.');
        }}
        securitySettings={securitySettings}
      />

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
        onOpenQuickPaste={(text?: string) => {
          setPastedClipboardText(text || '');
          setIsQuickPasteOpen(true);
        }}
        onOpenBillScanner={() => setIsBillScannerOpen(true)}
        onOpenVoiceLogger={() => setIsVoiceLoggerOpen(true)}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        onOpenGoogleSheetModal={() => setIsGoogleSheetModalOpen(true)}
        primaryCurrency={primaryCurrency}
        setPrimaryCurrency={setPrimaryCurrency}
        fxValuationMode={fxValuationMode}
        setFxValuationMode={handleFXModeChange}
        isPrivacyMasked={isPrivacyMasked}
        onTogglePrivacyMask={handleTogglePrivacyMask}
        transactions={transactions}
      />

      {/* Global High-Visibility Currency Switcher & Filter Bar */}
      <GlobalControlBar
        primaryCurrency={primaryCurrency}
        setPrimaryCurrency={setPrimaryCurrency}
        filterState={globalFilters}
        setFilterState={setGlobalFilters}
        isPrivacyMasked={isPrivacyMasked}
        onTogglePrivacyMask={handleTogglePrivacyMask}
        onOpenGoogleSheetModal={() => setIsGoogleSheetModalOpen(true)}
        totalTransactionsCount={filteredTransactions.length}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 sm:bottom-8 right-4 sm:right-24 z-50 bg-slate-900 border border-emerald-500/50 text-slate-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 max-w-[calc(100vw-2rem)]">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Floating Microphone Action Button for Instant Voice Logging */}
      <button
        onClick={() => setIsVoiceLoggerOpen(true)}
        className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] right-4 sm:right-6 z-40 p-3.5 sm:p-4 bg-gradient-to-tr from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-full shadow-2xl shadow-rose-600/40 hover:scale-105 active:scale-95 transition-all border-2 border-rose-400/40"
        title="Hands-Free Voice Logger (Say: 'Paid 365 AED for DEWA from ADCB')"
      >
        <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

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
            accounts={filteredAccounts}
            transactions={filteredTransactions}
            fxRates={fxRates}
            khumsSnapshots={khumsSnapshots}
            sponsorships={sponsorships}
            primaryCurrency={primaryCurrency}
            setPrimaryCurrency={setPrimaryCurrency}
            onNavigateTab={setActiveTab}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenVoiceLogger={() => setIsVoiceLoggerOpen(true)}
            onOpenBillScanner={() => setIsBillScannerOpen(true)}
            onOpenQuickPaste={(text?: string) => {
              setPastedClipboardText(text || '');
              setIsQuickPasteOpen(true);
            }}
            onOpenGoogleSheetModal={() => setIsGoogleSheetModalOpen(true)}
            isPrivacyMasked={isPrivacyMasked}
            onTogglePrivacyMask={handleTogglePrivacyMask}
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
            onNavigateToCoordinators={() => setActiveTab('coordinators')}
          />
        )}

        {/* Coordinator Groups & Auto-Splitter */}
        {activeTab === 'coordinators' && (
          <CoordinatorManagerView />
        )}

        {/* Planned Schedules & Calendar Reminders */}
        {activeTab === 'reminders' && (
          <PlannedRemindersView />
        )}

        {/* Advanced Reports & Donation % Tracker */}
        {activeTab === 'reports' && (
          <AdvancedReportsView />
        )}

        {/* Loans, Receivables, Fiqh Checklist & Google Drive Sync */}
        {activeTab === 'loans' && (
          <LoansLedgerView />
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
            transactions={filteredTransactions}
            accounts={filteredAccounts}
            initialFilterTab="ALL"
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onRefreshData={refreshAllData}
            isPrivacyMasked={isPrivacyMasked}
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
            isPrivacyMasked={isPrivacyMasked}
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

        {activeTab === 'studio' && (
          <NoCodeStudioView
            accounts={accounts}
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

      {/* Multimodal Bill, Receipt & PDF Statement Scanner */}
      <BillScannerModal
        isOpen={isBillScannerOpen}
        onClose={() => setIsBillScannerOpen(false)}
        accounts={accounts}
        onSuccess={refreshAllData}
      />

      {/* Voice Note / Speech-to-Transaction Logger */}
      <VoiceLoggerModal
        isOpen={isVoiceLoggerOpen}
        onClose={() => setIsVoiceLoggerOpen(false)}
        accounts={accounts}
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

      {/* Google Sheet Two-Way Live Sync Hub Modal */}
      <GoogleSheetSyncModal
        isOpen={isGoogleSheetModalOpen}
        onClose={() => setIsGoogleSheetModalOpen(false)}
        onRefreshData={refreshAllData}
        showToast={showToast}
      />

    </div>
  );
};

export default App;
