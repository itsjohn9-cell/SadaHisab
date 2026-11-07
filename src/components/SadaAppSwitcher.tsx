import React, { useState, useEffect } from 'react';
import { Grid, ExternalLink, ShieldCheck } from 'lucide-react';
import { createSsoUrl, SadaPassportSession } from '../services/sada-bridge';
import bundledRegistry from '../sada-registry.json';

export interface AppRegistryItem {
  id: string;
  name: string;
  tagline: string;
  prodUrl: string;
  customScheme: string;
  accentColor: string;
  capabilities: string[];
}

const DEFAULT_REGISTRY: AppRegistryItem[] = (bundledRegistry as any)?.apps || [
  {
    id: 'sadalink',
    name: 'SadaLink',
    tagline: 'Real-time communication & signaling',
    prodUrl: 'https://35.209.1.82.nip.io',
    customScheme: 'sadalink://',
    accentColor: '#00A884',
    capabilities: ['chat', 'calling', 'ephemeral-media', 'relay-host', 'hisaab-bot'],
  },
  {
    id: 'sadaflow',
    name: 'SadaFlow',
    tagline: 'E2EE universal clipboard & workspace',
    prodUrl: 'https://sadaflow.onrender.com',
    customScheme: 'sadaflow://',
    accentColor: '#4f46e5',
    capabilities: ['e2ee-clipboard', 'notes', 'checklists', 'hisaab-slips'],
  },
  {
    id: 'sadahisaab',
    name: 'Sada Hisaab',
    tagline: 'Multi-currency cash & khums ledger',
    prodUrl: 'https://itsjohn9-cell.github.io/SadaHisab',
    customScheme: 'sadahisaab://',
    accentColor: '#16a34a',
    capabilities: ['ledger', 'accounting', 'khums', 'voice-logger', 'bill-scanner'],
  },
];

interface Props {
  currentAppId: 'sadalink' | 'sadaflow' | 'sadahisaab' | string;
  session?: SadaPassportSession | null;
}

export const SadaAppSwitcher: React.FC<Props> = ({ currentAppId, session }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [apps, setApps] = useState<AppRegistryItem[]>(DEFAULT_REGISTRY);

  useEffect(() => {
    fetch('https://35.209.1.82.nip.io/api/sada-registry')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.apps && Array.isArray(data.apps)) {
          setApps(data.apps);
        }
      })
      .catch(() => {});
  }, []);

  const handleLaunch = (app: AppRegistryItem) => {
    let target = app.prodUrl;
    if (session) {
      const ssoBlob = {
        sada_uid: session.sada_uid,
        sada_uid_hash: session.sada_uid_hash,
        identifier: session.identifier,
        identifier_type: session.identifier_type,
        ts: Date.now(),
      };
      target = createSsoUrl(app.prodUrl, ssoBlob);
    }
    window.open(target, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Sada Suite Ecosystem Apps"
        className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium"
      >
        <Grid className="w-4 h-4 text-emerald-400" />
        <span className="hidden sm:inline">Sada Suite</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sada Ecosystem</span>
              {session && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-800/40">
                  <ShieldCheck className="w-3 h-3" /> 1-Tap SSO
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              {apps.map((app) => {
                const isCurrent = app.id === currentAppId;
                return (
                  <button
                    key={app.id}
                    onClick={() => !isCurrent && handleLaunch(app)}
                    disabled={isCurrent}
                    className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-all ${
                      isCurrent
                        ? 'bg-slate-900/60 border border-slate-700/50 cursor-default opacity-80'
                        : 'hover:bg-slate-900 border border-transparent hover:border-slate-800 cursor-pointer'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5 shadow-sm"
                      style={{ backgroundColor: app.accentColor }}
                    >
                      {app.name.charAt(4) || app.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-200 truncate">{app.name}</span>
                        {isCurrent ? (
                          <span className="text-[10px] text-slate-500 font-mono">active</span>
                        ) : (
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{app.tagline}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

