import React from 'react';
import { 
  ShieldAlert, 
  Download, 
  X, 
  ArrowRight, 
  Lock 
} from 'lucide-react';

interface BackupReminderBannerProps {
  daysSinceLastBackup: number;
  onOpenBackupModal: () => void;
  onDismiss: () => void;
}

export const BackupReminderBanner: React.FC<BackupReminderBannerProps> = ({
  daysSinceLastBackup,
  onOpenBackupModal,
  onDismiss
}) => {
  return (
    <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border border-amber-600/50 rounded-2xl p-3.5 sm:p-4 mb-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-white">
            14-Day Backup Health Reminder
          </h4>
          <p className="text-[11px] text-amber-200/80">
            {daysSinceLastBackup >= 999 
              ? 'You have not exported an encrypted backup vault yet. Keep an offline copy safe!'
              : `Last backup was exported ${daysSinceLastBackup} days ago. Create an AES-256 encrypted backup.`}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 self-end sm:self-center">
        <button
          onClick={onOpenBackupModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-md transition"
        >
          <Lock className="h-3.5 w-3.5" />
          <span>Export .khumsvault</span>
        </button>
        <button
          onClick={onDismiss}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
          title="Dismiss for this session"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
