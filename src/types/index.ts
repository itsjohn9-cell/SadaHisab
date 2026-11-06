export type Currency = 'PKR' | 'AED' | 'USD' | 'GBP' | 'SAR' | 'MYR' | 'IQD';

export type AccountType = 
  | 'BANK' 
  | 'DIGITAL_WALLET' 
  | 'CASH' 
  | 'PRIZE_BOND' 
  | 'CREDIT_CARD' 
  | 'CUSTODIAL' 
  | 'FOREIGN_CASH';

export type AccountCountry = 'PK' | 'AE' | 'INTL';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  initialBalance: number;
  currentBalance: number;
  isCustodial: boolean; // e.g., Wife, Children Galla, Hajj
  isKhumsExempt: boolean;
  country: AccountCountry;
  notes?: string;
  isSampleData?: boolean;
  lastReconciledDate?: string;
  lastReconciledBalance?: number;
  updatedAt?: string;
}

export type TransactionType = 
  | 'EXPENSE' 
  | 'INCOME' 
  | 'TRANSFER' 
  | 'CREDIT_CARD_SWIPE' 
  | 'CREDIT_CARD_PAYMENT'
  | 'RECONCILIATION_ADJUSTMENT';

export type TransactionStatus = 'CONFIRMED' | 'NEEDS_REVIEW';

export interface Transaction {
  id: string;
  date: string; // ISO format: YYYY-MM-DD
  type: TransactionType;
  amount: number;
  currency: Currency;
  convertedAmountPKR: number;
  fxRateUsed: number;
  category: string;
  subCategory?: string; // e.g., School Fees, Maulana's, FBIS Exam Fees
  merchantOrRecipient?: string; // 'Spent At'
  sourceAccountId?: string;
  destinationAccountId?: string; // For transfers
  beneficiaryPhone?: string; // Extracted phone (03\d{9})
  paymentChannel?: string; // Easypaisa, JazzCash, ADCB Transfer, etc.
  description?: string;
  status: TransactionStatus;
  isSampleData?: boolean;
  healingNotes?: string[];
  lastMonthReferenceAmount?: number;
  rosterBatchMonth?: string; // e.g. "2026-11" for monthly recurring batch
  fuelDetails?: {
    liters?: number;
    pricePerLiter?: number;
  };
  isReconciliationAdjustment?: boolean;
  dedupeHash?: string; // Tier 1 Deterministic Fingerprint
  receiptThumbnail?: string; // Base64 thumbnail or icon
  receiptBlobId?: string; // Attached receipt ID
  sourceChannel?: 'MANUAL' | 'EXCEL' | 'SMS' | 'OCR' | 'AI_VISION' | 'VOICE' | 'STATEMENT';
  linkedTransferTxId?: string; // Tier 3 Linked transfer/card payment
  createdAt?: string;
}

export interface FXRate {
  currency: Currency;
  baseCurrency: 'PKR';
  liveRate: number; // 1 unit in PKR
  spreadAdjustment: number; // e.g. -1 PKR conservative spread
  effectiveRate: number; // liveRate + spreadAdjustment
  updatedAt: string;
}

export interface KhumsSnapshot {
  year: number;
  cutoffDate: string; // Custom configurable date, default YYYY-11-30
  totalSavingsPKR: number;
  unusedConsumables20PctPKR: number; // food/perfumes left over
  newUnusedItems25PctPKR: number; // unworn clothes, unopened goods
  loansGivenReceivablesPKR: number; // e.g. 328,369 loan given to family (Khumsable)
  wifeAndCustodialSubtractPKR: number; // excluded from Khums
  pendingLiabilitiesCCSubtractPKR: number; // CC debt, pending loans taken (deducted)
  priorYearKhumsedCapitalPKR: number; // Deducted so already-purified wealth is never taxed twice
  netKhumsableAmountPKR: number; // calculated Net Wealth
  khumsCalculated20PctPKR: number; // 20% of netKhumsableAmountPKR (if positive)
  extraVoluntaryPKR: number; // optional extra voluntary Sadaqah / Khums
  khumsPaidPKR: number;
  notes?: string;
  isLocked?: boolean;
  isSampleData?: boolean;
}

export interface Sponsorship {
  id: string;
  name: string;
  category: 'STUDENT_FEE' | 'RELIGIOUS' | 'FAMILY_SUPPORT' | 'HEALTHCARE';
  monthlyAmount: number;
  currency: Currency;
  recipientPhone?: string;
  preferredChannel?: string;
  dueDay: number; // Day of month (1-31)
  active: boolean;
  notes?: string;
  lastPaidDate?: string;
}

export interface MerchantRule {
  id: string;
  keyword: string;
  category: string;
  subCategory?: string;
  defaultAccountId?: string;
  defaultAmount?: number;
  notes?: string;
  matchCount?: number;
  createdAt: string;
}

export interface RosterItem {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  defaultAmount: number;
  currency: Currency;
  sourceAccountId: string;
  beneficiaryPhone?: string;
  paymentChannel?: string;
  defaultDay: number; // 1-31
  notes?: string;
  isActive: boolean;
  isBillReminder?: boolean;
  reminderType?: 'FAMILY_ALLOWANCE' | 'FIXED_BILL' | 'EDUCATION' | 'SADAQAH_ROSTER';
  lastCommittedMonth?: string;
}

export interface RosterBatchDraftItem extends RosterItem {
  selected: boolean;
  adjustedAmount: number;
  adjustmentNote?: string;
}

// Module 5: Loans & Receivables Ledger
export interface LoanRecord {
  id: string;
  type: 'LENT_RECEIVABLE' | 'BORROWED_LIABILITY';
  counterpartyName: string; // e.g. "Family Member (328,369 loan)"
  relationship?: string;
  originalAmount: number;
  remainingAmount: number;
  currency: Currency;
  lentDate: string; // YYYY-MM-DD
  dueDate?: string;
  isRecoverable: boolean; // Accessible/Recoverable (Include in Khums) vs Doubtful (Exclude)
  notes?: string;
  repayments?: Array<{
    date: string;
    amount: number;
    notes?: string;
  }>;
}

// Module 5: App Settings
export interface AppSecuritySettings {
  isAppLockEnabled: boolean;
  pinHash?: string;
  pinSalt?: string;
  hasBiometrics: boolean;
  biometricCredentialId?: string;
  autoLockTimeoutMs: number;
  lastBackupDate?: string;
  geminiApiKey?: string;
  customKhumsCutoffMonthDay?: string; // e.g. "11-30" (Nov 30 default)
  targetDonationPercentage?: number; // e.g. 10%
  googleDriveClientId?: string;
  googleDriveAccessToken?: string;
  googleDriveAutoSync?: boolean;
  googleDriveLastSync?: string;
}

// Module 1: OCR & Bill Extracted Item
export interface ExtractedBillData {
  merchant: string;
  date: string;
  totalAmount: number;
  taxAmount?: number;
  currency: Currency;
  category: string;
  subCategory?: string;
  accountHint?: string;
  billReferenceNumber?: string;
  lineItems?: Array<{
    description: string;
    amount: number;
    quantity?: number;
  }>;
  rawText: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceEngine: 'LOCAL_PDF' | 'LOCAL_OCR' | 'GEMINI_VISION';
}

export interface StatementRowDraft {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: Currency;
  direction: TransactionType;
  inferredCategory: string;
  inferredAccountId: string;
  selected: boolean;
}

export interface ParsedSMSResult {
  rawText: string;
  isOTPBlocked: boolean;
  blockedReason?: string;
  date: string;
  amount: number;
  currency: Currency;
  direction: TransactionType;
  inferredAccountId?: string;
  merchantOrRecipient: string;
  category: string;
  subCategory?: string;
  beneficiaryPhone?: string;
  paymentChannel?: string;
  referenceNumber?: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  fuelDetails?: {
    liters?: number;
    pricePerLiter?: number;
  };
  ruleApplied?: string;
}

export interface ReconciliationComparison {
  accountId: string;
  accountName: string;
  currency: Currency;
  excelRow66Balance: number;
  recalculatedFullBalance: number;
  discrepancy: number;
  totalTransactionsCount: number;
}

export interface HealingReportItem {
  id: string;
  rowNumber: number;
  sheet: string;
  issueType: 'STRING_AMOUNT' | 'SHIFTED_COLUMN' | 'MISSING_DATE' | 'EXTRACTED_PHONE' | 'TRUNCATED_ROW';
  description: string;
  before: string;
  after: string;
  status: 'AUTO_HEALED' | 'FLAGGED_REVIEW';
}

export interface ExcelHealingSummary {
  totalRowsProcessed: number;
  expenseRows: number;
  incomeRows: number;
  transferRows: number;
  healedAmountsCount: number;
  shiftedColumnsFixedCount: number;
  missingDatesInferredCount: number;
  phonesExtractedCount: number;
  items: HealingReportItem[];
  reconciliation: ReconciliationComparison[];
}

export interface PotentialDuplicateMatch {
  existingTransaction: Transaction;
  incomingTransaction: Partial<Transaction>;
  matchReason: string;
  dateDiffDays: number;
  amountDiffPercent: number;
}
