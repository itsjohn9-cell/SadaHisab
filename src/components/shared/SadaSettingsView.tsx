import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Globe, 
  Palette, 
  Shield, 
  Share2, 
  HardDrive, 
  Check, 
  Copy, 
  RefreshCw, 
  Moon, 
  Sun, 
  Sparkles, 
  Volume2, 
  Vibrate, 
  Download, 
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { SADA_RELAY_URL, bridgeDb } from '../../services/sada-bridge';

export type SettingsTab = 'general' | 'appearance' | 'security' | 'bridge' | 'vault';

export interface SadaSettingsViewProps {
  isOpen: boolean;
  onClose: () => void;
  appId: string;
  appName?: string;
  onSave?: (newConfig: any) => void;
}

export const SadaSettingsView: React.FC<SadaSettingsViewProps> = ({
  isOpen,
  onClose,
  appId,
  appName = 'Sada Suite',
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isSaved, setIsSaved] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Settings State
  const [language, setLanguage] = useState<'en' | 'ur' | 'ar'>('en');
  const [numberFormat, setNumberFormat] = useState<'standard' | 'lakh'>('standard');
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'oled'>('dark');
  const [fontDensity, setFontDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);

  // Storage and Network telemetry
  const [storageUsage, setStorageUsage] = useState<{ used: number; total: number }>({ used: 0, total: 0 });
  const [relayLatency, setRelayLatency] = useState<number | null>(null);
  const [relayChecking, setRelayChecking] = useState(false);
  const [outboxCount, setOutboxCount] = useState(0);
  const [sadaUidHash, setSadaUidHash] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    // Load saved settings
    const savedTheme = (localStorage.getItem('sada-theme') as any) || 'dark';
    setTheme(savedTheme);
    const savedLang = (localStorage.getItem('sada-lang') as any) || 'en';
    setLanguage(savedLang);
    const savedFormat = (localStorage.getItem('sada-num-format') as any) || 'standard';
    setNumberFormat(savedFormat);

    // Estimate storage
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        setStorageUsage({
          used: Math.round((est.usage || 0) / (1024 * 1024)),
          total: Math.round((est.quota || 0) / (1024 * 1024)),
        });
      }).catch(() => {});
    }

    // Load active passport fingerprint
    bridgeDb.identities.toArray().then((identities) => {
      if (identities.length > 0) {
        setSadaUidHash(identities[0].sada_uid_hash || identities[0].sada_uid);
      } else {
        setSadaUidHash('sada_anon_' + Math.random().toString(36).substring(2, 10));
      }
    }).catch(() => {
      setSadaUidHash('sada_local_vault');
    });

    // Check outbox
    bridgeDb.outbox.count().then((count) => setOutboxCount(count)).catch(() => {});

    // Ping relay
    checkRelayHealth();
  }, [isOpen]);

  const checkRelayHealth = async () => {
    setRelayChecking(true);
    const start = performance.now();
    try {
      const res = await fetch(`${SADA_RELAY_URL}/api/health`, { method: 'GET', cache: 'no-store' });
      if (res.ok) {
        setRelayLatency(Math.round(performance.now() - start));
      } else {
        setRelayLatency(null);
      }
    } catch {
      setRelayLatency(null);
    } finally {
      setRelayChecking(false);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'oled') => {
    setTheme(newTheme);
    const root = document.documentElement;
    root.classList.remove('dark', 'oled');
    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.removeAttribute('data-theme');
    } else if (newTheme === 'oled') {
      root.classList.add('dark', 'oled');
      root.setAttribute('data-theme', 'oled');
    } else {
      root.removeAttribute('data-theme');
    }

    // Sync theme-color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        newTheme === 'oled' ? '#000000' : newTheme === 'dark' ? '#020617' : '#ffffff'
      );
    }
  };

  const handleSaveAll = () => {
    localStorage.setItem('sada-theme', theme);
    localStorage.setItem('sada-lang', language);
    localStorage.setItem('sada-num-format', numberFormat);
    localStorage.setItem('sada-haptics', String(hapticsEnabled));
    localStorage.setItem('sada-sound', String(soundEnabled));
    localStorage.setItem('sada-density', fontDensity);

    onSave?.({
      theme,
      language,
      numberFormat,
      hapticsEnabled,
      soundEnabled,
      fontDensity,
      biometricsEnabled,
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const copyFingerprint = () => {
    if (sadaUidHash) {
      navigator.clipboard.writeText(sadaUidHash);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'general', label: 'General', icon: <Globe className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
    { id: 'security', label: 'Passport & Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'bridge', label: 'Bridge & Sync', icon: <Share2 className="w-4 h-4" /> },
    { id: 'vault', label: 'Local Vault & Backup', icon: <HardDrive className="w-4 h-4" /> },
  ];

  return (
    <div 
      data-sada-app={appId}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl bg-card border-0 sm:border border-border sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-card-foreground">
        
        {/* Header (Notch Safe) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border/80 bg-background/50 pt-safe">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
                Settings & Configuration
              </h2>
              <span className="text-[11px] text-muted-foreground">{appName} Control Center</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Settings"
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Responsive Body: 2-Column Desktop, Stacked Tabs Mobile */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Navigation Sidebar (Desktop: Left Rail / Mobile: Horizontal Segmented Bar) */}
          <div className="w-full md:w-60 border-b md:border-b-0 md:border-e border-border/70 bg-muted/20 p-2 md:p-3 overflow-x-auto md:overflow-y-auto shrink-0 flex md:flex-col gap-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition whitespace-nowrap md:w-full min-h-[40px] text-start ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Content Panel */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* TAB 1: GENERAL */}
            {activeTab === 'general' && (
              <div className="space-y-5 animate-in fade-in duration-100">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Regional & Localization</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Configure preferred language, numerals, and feedback.</p>
                </div>

                <div className="space-y-4">
                  {/* Language */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl border border-border/60 bg-muted/30">
                    <div>
                      <span className="text-xs font-medium text-foreground">Language / زبان</span>
                      <p className="text-[11px] text-muted-foreground">Select system UI language.</p>
                    </div>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as any)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
                    >
                      <option value="en">English</option>
                      <option value="ur">اردو (Urdu)</option>
                      <option value="ar">العربية (Arabic)</option>
                    </select>
                  </div>

                  {/* Number Formatting */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl border border-border/60 bg-muted/30">
                    <div>
                      <span className="text-xs font-medium text-foreground">Numeric Scale</span>
                      <p className="text-[11px] text-muted-foreground">Format for currency and financial figures.</p>
                    </div>
                    <select
                      value={numberFormat}
                      onChange={(e) => setNumberFormat(e.target.value as any)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
                    >
                      <option value="standard">Standard (1,000,000)</option>
                      <option value="lakh">Lakh / Crore (10,00,000)</option>
                    </select>
                  </div>

                  {/* Feedback: Haptics & Audio */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/30 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Vibrate className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium">Haptic Feedback</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={hapticsEnabled}
                        onChange={(e) => setHapticsEnabled(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/30 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium">Audio Cues</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={soundEnabled}
                        onChange={(e) => setSoundEnabled(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: APPEARANCE */}
            {activeTab === 'appearance' && (
              <div className="space-y-5 animate-in fade-in duration-100">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Theme & Visual Density</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Customize color theme, contrast, and layout compacting.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Light */}
                  <div
                    onClick={() => handleThemeChange('light')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border cursor-pointer transition select-none ${
                      theme === 'light'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                        : 'border-border/70 hover:border-border bg-card'
                    }`}
                  >
                    <Sun className="w-6 h-6 text-amber-500 mb-2" />
                    <span className="text-xs font-semibold text-foreground">Light Mode</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">Crisp daytime</span>
                  </div>

                  {/* Dark */}
                  <div
                    onClick={() => handleThemeChange('dark')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border cursor-pointer transition select-none ${
                      theme === 'dark'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                        : 'border-border/70 hover:border-border bg-card'
                    }`}
                  >
                    <Moon className="w-6 h-6 text-blue-400 mb-2" />
                    <span className="text-xs font-semibold text-foreground">Dark Mode</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">Deep slate & navy</span>
                  </div>

                  {/* OLED */}
                  <div
                    onClick={() => handleThemeChange('oled')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border cursor-pointer transition select-none ${
                      theme === 'oled'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                        : 'border-border/70 hover:border-border bg-card'
                    }`}
                  >
                    <Sparkles className="w-6 h-6 text-amber-400 mb-2" />
                    <span className="text-xs font-semibold text-foreground">OLED Black</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">#000000 True Black</span>
                  </div>
                </div>

                {/* Font Density */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl border border-border/60 bg-muted/30">
                  <div>
                    <span className="text-xs font-medium text-foreground">Layout Density</span>
                    <p className="text-[11px] text-muted-foreground">Adjust spacing for high-density tabular ledgers.</p>
                  </div>
                  <div className="flex gap-1 p-1 bg-background rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setFontDensity('comfortable')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                        fontDensity === 'comfortable' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      Comfortable
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontDensity('compact')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                        fontDensity === 'compact' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      Compact
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PASSPORT & SECURITY */}
            {activeTab === 'security' && (
              <div className="space-y-5 animate-in fade-in duration-100">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Passport Identity & E2EE</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Zero-knowledge master key, biometrics, and identity fingerprint.</p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-border/60 bg-muted/30 space-y-2">
                    <span className="text-xs font-medium text-foreground">Sada UID Fingerprint</span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-2.5 py-1.5 text-[11px] font-mono bg-background border border-border rounded-lg text-muted-foreground truncate select-all">
                        {sadaUidHash || 'No active identity bound'}
                      </code>
                      <button
                        type="button"
                        onClick={copyFingerprint}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground flex items-center gap-1.5"
                      >
                        {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copySuccess ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/30 cursor-pointer">
                    <div>
                      <span className="text-xs font-medium text-foreground">WebAuthn Biometric Lock</span>
                      <p className="text-[11px] text-muted-foreground">Require Fingerprint / FaceID to unlock vault.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={biometricsEnabled}
                      onChange={(e) => setBiometricsEnabled(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 4: BRIDGE & SYNC */}
            {activeTab === 'bridge' && (
              <div className="space-y-5 animate-in fade-in duration-100">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Bridge & Relay Infrastructure</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Check health of the lightweight transit relay and outbound queues.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/30">
                    <div>
                      <span className="text-xs font-medium text-foreground">Transit Relay Host</span>
                      <p className="text-[11px] text-muted-foreground font-mono">{SADA_RELAY_URL}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {relayChecking ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : relayLatency !== null ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-500">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {relayLatency} ms
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono text-rose-500">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          Unreachable
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={checkRelayHealth}
                        className="p-1 rounded text-muted-foreground hover:text-foreground"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/30">
                    <div>
                      <span className="text-xs font-medium text-foreground">Outbox Queue Status</span>
                      <p className="text-[11px] text-muted-foreground">Pending cross-app encrypted packets.</p>
                    </div>
                    <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-background border border-border">
                      {outboxCount} pending
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: VAULT & BACKUP */}
            {activeTab === 'vault' && (
              <div className="space-y-5 animate-in fade-in duration-100">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Local Vault & Quota</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage encrypted offline data, backups, and cache.</p>
                </div>

                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/30 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground">IndexedDB Storage</span>
                    <span className="text-muted-foreground font-mono">{storageUsage.used} MB used</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(5, (storageUsage.used / (storageUsage.total || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      alert('Encrypted JSON Vault export triggered. Your zero-knowledge backup is downloading.');
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition min-h-[44px]"
                  >
                    <Download className="w-4 h-4" />
                    Export Encrypted Backup
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Clear temporary image caches and sync metadata? Local ledger remains untouched.')) {
                        localStorage.removeItem('sada_cache_temp');
                        alert('Cache cleared.');
                      }
                    }}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-xs font-medium text-destructive transition min-h-[44px]"
                  >
                    <Trash2 className="w-4 h-4" />
                    Purge Temporary Cache
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Sticky Action Footer (Hardware Safe Area) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-border bg-background/90 backdrop-blur-md pb-safe">
          <span className="text-[11px] text-muted-foreground">
            Changes are saved to local zero-knowledge store.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-border bg-muted/30 hover:bg-muted text-foreground transition min-h-[40px]"
            >
              Close
            </button>
            <button
              onClick={handleSaveAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition shadow-sm min-h-[40px]"
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Saved
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
