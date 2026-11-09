import React from 'react';
import { 
  Search, 
  Settings, 
  Lock, 
  RefreshCw, 
  WifiOff
} from 'lucide-react';
import { SadaAppSwitcher } from '../SadaAppSwitcher';

export interface SadaHeaderBarProps {
  appId: string;
  appName?: string;
  tagline?: string;
  accentColor?: string;
  outboxPendingCount?: number;
  isOnline?: boolean;
  onOpenCommandMenu?: () => void;
  onOpenSettings?: () => void;
  onLockSession?: () => void;
  userIdentifier?: string;
  children?: React.ReactNode;
}

export const SadaHeaderBar: React.FC<SadaHeaderBarProps> = ({
  appId = 'sadahisab',
  appName = 'Sada Hisaab',
  tagline,
  accentColor = '#059669',
  outboxPendingCount = 0,
  isOnline = true,
  onOpenCommandMenu,
  onOpenSettings,
  onLockSession,
  userIdentifier,
  children,
}) => {
  return (
    <header 
      data-sada-app={appId}
      className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md transition-colors select-none pt-safe"
    >
      <div className="flex items-center justify-between h-14 px-3 sm:px-6 max-w-7xl mx-auto gap-2">
        {/* Left: App Identity */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 p-1.5 -ms-1.5 text-foreground">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm font-bold text-sm shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              {appName.charAt(0)}
            </div>
            <div className="flex flex-col text-start leading-none">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                {appName}
              </span>
              {tagline && (
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  {tagline}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center / Search: Command Menu Pill */}
        <div className="flex-1 max-w-md mx-2 hidden md:flex items-center">
          <button
            onClick={onOpenCommandMenu}
            className="flex items-center justify-between w-full px-3 py-1.5 text-xs text-muted-foreground bg-muted/50 hover:bg-muted/80 border border-border/60 rounded-xl transition shadow-xs group min-h-[36px]"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition" />
              <span>Search or type a command...</span>
            </span>
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground bg-background rounded border border-border">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Controls: Sync Badge, User Identifier, App Switcher, Mobile Search, Lock, Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* User Identifier Tag if present */}
          {userIdentifier && (
            <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md hidden lg:inline max-w-[120px] truncate border border-border/50">
              {userIdentifier}
            </span>
          )}

          {/* Sync Outbox Pill */}
          <div 
            title={
              outboxPendingCount > 0 
                ? `${outboxPendingCount} packets in sync queue` 
                : isOnline 
                  ? 'Sync Engine: Online' 
                  : 'Offline Vault'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
              outboxPendingCount > 0
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-500'
                : isOnline
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                  : 'border-muted-foreground/30 bg-muted text-muted-foreground'
            }`}
          >
            {outboxPendingCount > 0 ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
                <span className="tabular-nums font-mono hidden sm:inline">{outboxPendingCount}</span>
              </>
            ) : isOnline ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">Synced</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-muted-foreground" />
                <span className="hidden sm:inline">Offline</span>
              </>
            )}
          </div>

          {/* Cross-App Encrypted SSO Switcher */}
          <SadaAppSwitcher currentAppId={appId} />

          {/* Mobile Search Button */}
          <button
            onClick={onOpenCommandMenu}
            aria-label="Open Command Menu"
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl hover:bg-muted/70 active:scale-95 transition text-muted-foreground hover:text-foreground"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Lock Session Button */}
          {onLockSession && (
            <button
              onClick={onLockSession}
              title="Lock Session"
              aria-label="Lock Session"
              className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-muted/70 active:scale-95 transition text-muted-foreground hover:text-rose-500"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}

          {/* Settings Trigger */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="Open Settings"
              aria-label="Open Settings"
              className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-muted/70 active:scale-95 transition text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Custom Child Elements */}
          {children}
        </div>
      </div>
    </header>
  );
};
