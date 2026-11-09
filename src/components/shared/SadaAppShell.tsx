import React, { useState, useEffect } from 'react';
import { SadaHeaderBar } from './SadaHeaderBar';
import { SadaCommandMenu } from './SadaCommandMenu';
import { SadaSettingsView } from './SadaSettingsView';

export interface SadaNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
}

export interface SadaAppShellProps {
  appId: string;
  appName?: string;
  tagline?: string;
  accentColor?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  navigationItems?: SadaNavItem[];
  outboxPendingCount?: number;
  isOnline?: boolean;
  onLockSession?: () => void;
  userIdentifier?: string;
  onCustomAction?: (actionId: string) => void;
  children: React.ReactNode;
}

export const SadaAppShell: React.FC<SadaAppShellProps> = ({
  appId,
  appName = 'Sada Suite',
  tagline,
  accentColor = '#059669',
  activeTab,
  onTabChange,
  navigationItems = [],
  outboxPendingCount = 0,
  isOnline = true,
  onLockSession,
  userIdentifier,
  onCustomAction,
  children,
}) => {
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 1. Hardware & VisualViewport Virtual Keyboard Listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const viewport = window.visualViewport;
    const handleViewportChange = () => {
      if (!viewport) return;
      const heightDifference = window.innerHeight - viewport.height;
      const root = document.documentElement;
      
      // If viewport shrank by > 120px, the software keyboard is active
      if (heightDifference > 120) {
        root.classList.add('is-keyboard-open');
      } else {
        root.classList.remove('is-keyboard-open');
      }
    };

    if (viewport) {
      viewport.addEventListener('resize', handleViewportChange);
      viewport.addEventListener('scroll', handleViewportChange);
    }

    // 2. Hardware Back Button / Popstate Listener for Modals
    const handlePopState = (e: PopStateEvent) => {
      if (commandMenuOpen) {
        e.preventDefault();
        setCommandMenuOpen(false);
      } else if (settingsOpen) {
        e.preventDefault();
        setSettingsOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      if (viewport) {
        viewport.removeEventListener('resize', handleViewportChange);
        viewport.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('popstate', handlePopState);
    };
  }, [commandMenuOpen, settingsOpen]);

  return (
    <div 
      data-sada-app={appId}
      className="flex flex-col h-dvh w-full overflow-hidden bg-background text-foreground select-none"
    >
      {/* Global Top Header Bar */}
      <SadaHeaderBar
        appId={appId}
        appName={appName}
        tagline={tagline}
        accentColor={accentColor}
        outboxPendingCount={outboxPendingCount}
        isOnline={isOnline}
        onOpenCommandMenu={() => setCommandMenuOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onLockSession={onLockSession}
        userIdentifier={userIdentifier}
      />

      {/* Main Workspace Frame (Sidebar on Desktop + Content Area) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Adaptive Desktop Navigation Rail (>= 768px) */}
        {navigationItems.length > 0 && (
          <aside
            className={`hidden md:flex flex-col border-e border-border bg-card/40 backdrop-blur-xs transition-all duration-200 shrink-0 ${
              sidebarCollapsed ? 'w-16' : 'w-56'
            }`}
          >
            <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
              {navigationItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange?.(item.id)}
                    title={item.label}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-medium transition text-start select-none min-h-[44px] ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!sidebarCollapsed && (
                      <span className="flex-1 truncate">{item.label}</span>
                    )}
                    {!sidebarCollapsed && item.badge !== undefined && (
                      <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded-full ${
                        isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Collapse toggle at bottom of rail */}
            <div className="p-2 border-t border-border/60">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="w-full flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition text-xs font-medium min-h-[36px]"
              >
                {sidebarCollapsed ? '→' : '← Collapse'}
              </button>
            </div>
          </aside>
        )}

        {/* Scrollable Main Content Canvas */}
        <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative min-h-0 bg-background">
          <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-20 md:pb-6">
            {children}
          </div>
        </main>
      </div>

      {/* Adaptive Mobile Bottom Navigation Bar (< 768px) with Safe-Area Padding */}
      {navigationItems.length > 0 && (
        <nav className="md:hidden border-t border-border bg-card/90 backdrop-blur-md pb-safe select-none shrink-0 z-30">
          <div className="flex items-center justify-around h-14 px-2">
            {navigationItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange?.(item.id)}
                  className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition relative ${
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="relative">
                    {item.icon}
                    {item.badge !== undefined && (
                      <span className="absolute -top-1 -end-2 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-mono font-bold flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium tracking-tight mt-1 truncate max-w-[64px]">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Integrated Command Palette (Cmd+K / Ctrl+K) */}
      <SadaCommandMenu
        isOpen={commandMenuOpen}
        onClose={() => setCommandMenuOpen(false)}
        currentAppId={appId}
        onOpenSettings={() => setSettingsOpen(true)}
        onLockSession={onLockSession}
        onCustomAction={onCustomAction}
      />

      {/* Integrated Standardized Settings Modal */}
      <SadaSettingsView
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        appId={appId}
        appName={appName}
      />
    </div>
  );
};

