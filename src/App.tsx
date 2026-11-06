import React, { useState, useEffect, useCallback } from 'react';
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
  Sponsorship 
} from './types';
import { fetchLiveFXRates } from './services/fxService';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { LedgerView } from './components/LedgerView';
import { HealerQueueView } from './components/HealerQueueView';
import { KhumsView } from './components/KhumsView';
import { SponsorshipView } from './components/SponsorshipView';
import { ImportExportView } from './components/ImportExportView';
import { TransactionModal } from './components/TransactionModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ledger' | 'healer' | 'khums' | 'sponsorships' | 'import-export'>('dashboard');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fxRates, setFxRates] = useState<FXRate[]>([]);
  const [khumsSnapshots, setKhumsSnapshots] = useState<KhumsSnapshot[]>([]);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingFX, setIsSyncingFX] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [primaryCurrency, setPrimaryCurrency] = useState<'PKR' | 'AED'>('PKR');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch all state from Dexie IndexedDB
  const refreshAllData = useCallback(async () => {
    try {
      const [accs, txs, fx, khums, spons] = await Promise.all([
        db.accounts.toArray(),
        db.transactions.toArray(),
        db.fx_rates.toArray(),
        db.khums_snapshots.toArray(),
        db.sponsorships.toArray()
      ]);

      setAccounts(accs);
      setTransactions(txs);
      setFxRates(fx);
      setKhumsSnapshots(khums);
      setSponsorships(spons);
    } catch (err) {
      console.error('Error refreshing local database:', err);
    }
  }, []);

  // Initial mount
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await initializeDatabase();
      await refreshAllData();
      setIsLoading(false);
    }
    init();
  }, [refreshAllData]);

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
        <p className="text-sm font-semibold text-slate-300">Initializing Sada Hisab Local Database...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      
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
        <p>Sada Hisab &bull; 100% Local-First Multi-Currency & Annual Khums Accounting &bull; Zero Server Tracking</p>
      </footer>

      {/* Transaction Recording Modal */}
      <TransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        accounts={accounts}
        fxRates={fxRates}
        onSuccess={refreshAllData}
      />

    </div>
  );
};

export default App;
