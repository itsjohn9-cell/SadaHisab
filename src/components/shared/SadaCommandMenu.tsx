import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  CreditCard, 
  FileText, 
  MessageSquare, 
  Settings, 
  Moon, 
  Sun, 
  Sparkles, 
  ChevronRight,
  KeyRound
} from 'lucide-react';
import bundledRegistry from '../../sada-registry.json';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Quick Actions' | 'Ecosystem Navigation' | 'Preferences & Vault';
  icon: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
}

export interface SadaCommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentAppId?: string;
  onOpenSettings?: () => void;
  onLockSession?: () => void;
  onCustomAction?: (actionId: string) => void;
}

export const SadaCommandMenu: React.FC<SadaCommandMenuProps> = ({
  isOpen,
  onClose,
  currentAppId = 'sadahisab',
  onOpenSettings,
  onLockSession,
  onCustomAction,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K & Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open via parent
          onCustomAction?.('toggle-command-menu');
        }
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onCustomAction]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const toggleTheme = (theme: 'light' | 'dark' | 'oled') => {
    const root = document.documentElement;
    root.classList.remove('dark', 'oled');
    if (theme === 'dark') {
      root.classList.add('dark');
      root.removeAttribute('data-theme');
    } else if (theme === 'oled') {
      root.classList.add('dark', 'oled');
      root.setAttribute('data-theme', 'oled');
    } else {
      root.removeAttribute('data-theme');
    }
    localStorage.setItem('sada-theme', theme);
    onClose();
  };

  const apps = (bundledRegistry as any)?.apps || [];

  const items: CommandItem[] = [
    // 1. Quick Actions
    {
      id: 'action-record-expense',
      title: 'Record Expense / Income',
      subtitle: 'Add double-entry financial record in Sada Hisaab',
      category: 'Quick Actions',
      icon: <CreditCard className="w-4 h-4 text-emerald-500" />,
      shortcut: 'E',
      onSelect: () => {
        onCustomAction?.('record-expense');
        onClose();
      },
    },
    {
      id: 'action-scratchpad-slip',
      title: 'New Scratchpad Slip',
      subtitle: 'Quick frictionless note or expense parser in Sada Flow',
      category: 'Quick Actions',
      icon: <FileText className="w-4 h-4 text-indigo-500" />,
      shortcut: 'N',
      onSelect: () => {
        onCustomAction?.('scratchpad-slip');
        onClose();
      },
    },
    {
      id: 'action-chat-message',
      title: 'Send Instant Message',
      subtitle: 'Start secure E2EE chat in Sada Link',
      category: 'Quick Actions',
      icon: <MessageSquare className="w-4 h-4 text-teal-500" />,
      shortcut: 'M',
      onSelect: () => {
        onCustomAction?.('chat-message');
        onClose();
      },
    },

    // 2. Ecosystem Navigation
    ...apps.map((app: any) => ({
      id: `app-nav-${app.id}`,
      title: `Switch to ${app.name}`,
      subtitle: app.tagline || app.core_mission,
      category: 'Ecosystem Navigation' as const,
      icon: (
        <span
          className="w-2.5 h-2.5 rounded-full inline-block"
          style={{ backgroundColor: app.accentColor || '#059669' }}
        />
      ),
      shortcut: app.id === currentAppId ? 'Current' : undefined,
      onSelect: () => {
        if (app.id !== currentAppId) {
          window.location.href = app.prodUrl || '#';
        }
        onClose();
      },
    })),

    // 3. Preferences & Vault
    {
      id: 'pref-theme-oled',
      title: 'OLED Pitch Black Mode',
      subtitle: 'True black #000000 high-contrast power saver',
      category: 'Preferences & Vault',
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
      onSelect: () => toggleTheme('oled'),
    },
    {
      id: 'pref-theme-dark',
      title: 'Dark Theme',
      subtitle: 'Deep slate & navy dark mode',
      category: 'Preferences & Vault',
      icon: <Moon className="w-4 h-4 text-blue-400" />,
      onSelect: () => toggleTheme('dark'),
    },
    {
      id: 'pref-theme-light',
      title: 'Light Theme',
      subtitle: 'Crisp neutral high-key daytime theme',
      category: 'Preferences & Vault',
      icon: <Sun className="w-4 h-4 text-amber-500" />,
      onSelect: () => toggleTheme('light'),
    },
    {
      id: 'pref-settings',
      title: 'Application Settings',
      subtitle: 'General, appearance, bridge integrations, vault backup',
      category: 'Preferences & Vault',
      icon: <Settings className="w-4 h-4 text-slate-400" />,
      shortcut: 'S',
      onSelect: () => {
        onOpenSettings?.();
        onClose();
      },
    },
    {
      id: 'pref-lock-session',
      title: 'Lock Session',
      subtitle: 'Lock vault with Sada Passport PIN & WebAuthn',
      category: 'Preferences & Vault',
      icon: <KeyRound className="w-4 h-4 text-rose-500" />,
      shortcut: 'L',
      onSelect: () => {
        onLockSession?.();
        onClose();
      },
    },
  ];

  const filteredItems = items.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDownList = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].onSelect();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl rounded-2xl border border-border bg-card/95 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] text-card-foreground animate-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDownList}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border/80 gap-3">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search actions..."
            className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground text-foreground min-h-[36px]"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-medium text-muted-foreground bg-muted border border-border rounded-md">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-2 space-y-1 divide-y divide-border/20">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No matching commands found.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition select-none ${
                    isSelected
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-muted/60 text-foreground shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium truncate">{item.title}</span>
                      {item.subtitle && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ms-2">
                    {item.shortcut && (
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted rounded border border-border">
                        {item.shortcut}
                      </kbd>
                    )}
                    <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-primary' : 'text-muted-foreground/40'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/60 bg-muted/30 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 text-[9px] font-mono bg-muted rounded border border-border">↑</kbd>
            <kbd className="px-1 py-0.5 text-[9px] font-mono bg-muted rounded border border-border">↓</kbd>
            to navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 text-[9px] font-mono bg-muted rounded border border-border">↵</kbd>
            to select
          </span>
        </div>
      </div>
    </div>
  );
};
