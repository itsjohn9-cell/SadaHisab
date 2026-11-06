// Core Domain Types for Sada Hisab (سادہ حساب)

export type AccountType = 
  | 'BANK' 
  | 'DIGITAL_WALLET' 
  | 'CASH' 
  | 'PRIZE_BOND' 
  | 'CREDIT_CARD' 
  | 'CUSTODIAL' 
  | 'FOREIGN_CASH';

export type Currency = 'PKR' | 'AED' | 'USD' | 'GBP' | 'SAR' | 'MYR' | 'IQD';

export type AccountCountry = 'PK' | 'AE' | 'INTL';

export type TransactionType = 
  | 'EXPENSE' 
  | 'INCOME' 
  | 'TRANSFER' 
  | 'CREDIT_CARD_SWIPE' 
  | 'CREDIT_CARD_PAYMENT'
  | 'RECONCILIATION_ADJUSTMENT';

export type TransactionStatus = 'CONFIRMED' | 'NEEDS_REVIEW';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  initialBalance: number;
  currentBalance: number;
  isCustodial: boolean; // Excluded from Khums (e.g. Children Galla, Wife Savings, Hajj)
  isKhumsExempt: boolean;
  notes?: string;
  country?: AccountCountry;
  isSampleData?: boolean;
  lastReconciledDate?: string;
  lastReconciledBalance?: number;
  updatedAt?: string;
  travelNotes?: string; // e.g. "Taken to Dubai"
  reconciliationNotes?: string; // e.g. Foreign tab tracker 7,416.60 USD vs 6,716.33 USD
}

export interface Transaction {
  id: string;
  date: string; // ISO YYYY-MM-DD
  type: TransactionType;
  amount: number;
  currency: Currency;
  convertedAmountPKR: number;
  fxRateUsed: number;
  category: string;
  subCategory?: string;
  merchantOrRecipient?: string;
  sourceAccountId?: string;
  destinationAccountId?: string; // For transfers & CC settlements
  beneficiaryPhone?: string; // e.g. 03120976573
  paymentChannel?: string; // Easypaisa, JazzCash, NayaPay, Raast, IBFT
  description?: string;
  status: TransactionStatus;
  isSampleData?: boolean;
  healingNotes?: string[];
  lastMonthReferenceAmount?: number;
  rosterBatchMonth?: string;
  fuelDetails?: {
    liters?: number;
    pricePerLiter?: number;
  };
  isReconciliationAdjustment?: boolean;
  dedupeHash?: string; // SHA-256 deterministic fingerprint
  receiptThumbnail?: string;
  receiptBlobId?: string; // Reference to receipt image/PDF in IndexedDB
  sourceChannel?: 'MANUAL' | 'EXCEL' | 'SMS' | 'OCR' | 'AI_VISION' | 'VOICE' | 'STATEMENT';
  linkedTransferTxId?: string;
  createdAt?: string;

  // Domain Intelligence additions:
  billingMonth?: string; // YYYY-MM (e.g. 2025-08)
  monthsCovered?: number; // 1, 2, 3 months
  formulaNote?: string; // e.g. "2 months × 4,500" from "=4500*2"
  subBeneficiary?: string; // e.g. "Bais Ali", "Saiqa", "Shaneela"
  parentTransferId?: string; // Links auto-split child rows to coordinator transfer
  isPrepaid?: boolean;
  prepaidUntilMonth?: string; // YYYY-MM
  isKematiLockedSavings?: boolean; // Kemati committee locked savings flag
}

export interface FXRate {
  currency: Currency;
  baseCurrency: Currency | 'PKR'; // Default PKR
  liveRate: number;
  spreadAdjustment: number; // e.g. -1 PKR for conservative valuation
  effectiveRate: number;
  snapshotRate?: number; // Fixed manual rate from Income tab (e.g. USD=278, AED=75.5)
  updatedAt: string;
}

export type FXValuationMode = 
  | 'CONSERVATIVE_SPREAD' // Live Rate - 1 PKR (Matches Totals tab)
  | 'LIVE_MID_MARKET'     // Direct open.er-api.com live rate
  | 'FIXED_SNAPSHOT';     // Manual snapshot rates (Matches Income tab)

export interface KhumsSnapshot {
  year: number; // e.g. 2024, 2025
  cutoffDate: string; // Configurable date, default November 30 (YYYY-11-30)
  totalSavingsPKR: number;
  unusedConsumables20PctPKR: number; // Consumables / perfumes
  newUnusedItems25PctPKR: number; // Unused items
  loansGivenReceivablesPKR: number; // e.g. 328,369 family loan
  kematiLockedEquityPKR?: number; // Accumulated committee savings
  wifeAndCustodialSubtractPKR: number; // Excluded custodial cash
  pendingLiabilitiesCCSubtractPKR: number; // CC / loans taken
  priorYearKhumsedCapitalPKR: number; // Prior year purified capital deducted
  netKhumsableAmountPKR: number;
  khumsCalculated20PctPKR: number;
  extraVoluntaryPKR: number;
  khumsPaidPKR: number;
  totalLiquidAssetsPKR?: number;
  consumablesValuePKR?: number;
  newGoodsValuePKR?: number;
  loanReceivablesPKR?: number;
  custodialDeductionsPKR?: number;
  creditCardLiabilitiesPKR?: number;
  previousPurifiedCapitalPKR?: number;
  khumsPayablePKR?: number;
  sahmImamPKR?: number;
  sahmSadatPKR?: number;
  isLocked: boolean;
  isSampleData?: boolean;
  notes?: string;
}

export type SponsorshipCategory = 
  | 'STUDENT_FEE' 
  | 'RELIGIOUS' 
  | 'FAMILY_SUPPORT' 
  | 'HEALTHCARE' 
  | 'SADAQAH' 
  | 'CLERGY_STIPEND' 
  | 'FAMILY_AID';

export interface Sponsorship {
  id: string;
  name?: string;
  beneficiaryName?: string; // e.g. "Maulana Qalbe Ali (Students)", "Khatoon Khatoon"
  category: SponsorshipCategory;
  subCategory?: string;
  monthlyAmount: number;
  currency: Currency;
  dueDay: number; // 1-31
  contactPhone?: string;
  recipientPhone?: string;
  paymentChannel?: string;
  preferredChannel?: string;
  preferredAccountId?: string;
  notes?: string;
  active: boolean;
  coordinatorGroupId?: string;
  lastPaidDate?: string;
}

export interface MerchantRule {
  id: string;
  keyword: string;
  category: string;
  subCategory?: string;
  defaultAccountId?: string;
  defaultCurrency?: Currency;
  matchCount?: number;
  createdAt?: string;
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
  // Domain Intelligence additions:
  coordinatorGroupId?: string;
  subBeneficiary?: string;
  prepaidUntilMonth?: string; // YYYY-MM
  lastMonthAmount?: number; // Col J / L reference for anomaly detection
  isWifeDualCurrency?: boolean; // Dual currency rule: 350 AED in UAE vs 14,000/18,000 PKR
}

export interface RosterBatchDraftItem extends RosterItem {
  selected: boolean;
  adjustedAmount: number;
  adjustmentNote?: string;
  monthsCovered?: number;
  isPrepaidSkipped?: boolean;
}

// Coordinator / Aggregator Groups
export interface CoordinatorSubItem {
  id: string;
  studentName: string;
  defaultAmount: number;
  subCategory: string;
  notes?: string;
  phone?: string;
}

export interface CoordinatorGroup {
  id: string;
  coordinatorName: string; // e.g. "Maulana Qalbe Ali"
  phone: string; // e.g. "03165777490"
  defaultAccountId: string; // e.g. "al-habib-pkr"
  paymentChannel: string; // e.g. "Al Habib - Rs"
  totalMonthlyCommitment: number;
  subItems: CoordinatorSubItem[];
  notes?: string;
}

// Kemati / Committee (ROSCA) Accounting
export interface KematiRecord {
  id: string;
  name: string; // e.g. "Kemati 50k (Jhone)"
  monthlyAmount: number; // e.g. 50,000 PKR
  currency: Currency;
  startDate: string; // YYYY-MM-DD
  durationMonths: number; // e.g. 10 or 20 months
  monthsPaid: number;
  payoutAmount: number; // e.g. 1,000,000 PKR
  expectedPayoutMonth: string; // YYYY-MM
  isPayoutReceived: boolean;
  includeInKhums: boolean;
  notes?: string;
}

// Monthly Block Detection & Clone Resolution
export interface MonthlyBlock {
  blockIndex: number;
  startRow: number;
  endRow: number;
  billingMonth: string; // YYYY-MM
  monthNameTag: string; // e.g. "August"
  rowCount: number;
  totalAmountPKR: number;
  isClone?: boolean;
  clonedFromBlockIndex?: number;
  cloneReason?: string;
  rows: any[];
}

export interface CloneResolutionBannerData {
  duplicateBlocks: Array<{
    originalBlock: MonthlyBlock;
    clonedBlock: MonthlyBlock;
    resolvedAction?: 'DISCARD_DUPLICATE' | 'KEEP_BOTH' | 'MERGE';
  }>;
}

// Loans & Receivables Ledger
export interface LoanRecord {
  id: string;
  type: 'LENT_RECEIVABLE' | 'BORROWED_LIABILITY';
  counterpartyName: string;
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

// App Settings & Security
export interface AppSecuritySettings {
  isAppLockEnabled: boolean;
  pinHash?: string;
  pinSalt?: string;
  hasBiometrics: boolean;
  biometricCredentialId?: string;
  autoLockTimeoutMs?: number;
  lastBackupDate?: string;
  geminiApiKey?: string;
  customKhumsCutoffMonthDay?: string; // e.g. "11-30" (Nov 30 default)
  targetDonationPercentage?: number; // e.g. 10%
  googleDriveClientId?: string;
  googleDriveAccessToken?: string;
  googleDriveAutoSync?: boolean;
  googleDriveLastSync?: string;
}

export interface ReceiptBlobRecord {
  id: string;
  mimeType: string;
  dataBase64?: string;
  data?: string;
  originalName?: string;
  extractedText?: string;
  createdAt: string;
}

export interface ExtractedBillData {
  merchant?: string;
  totalAmount?: number;
  taxAmount?: number;
  date?: string;
  currency?: Currency;
  accountHint?: string;
  category?: string;
  subCategory?: string;
  billReferenceNumber?: string;
  lineItems?: Array<{ description: string; amount: number; quantity?: number }>;
  rawOcrText?: string;
  rawText?: string;
  sourceConfidence?: number;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceEngine?: 'LOCAL_PDF' | 'LOCAL_OCR' | 'GEMINI_VISION';
}

export interface StatementRowDraft {
  id: string;
  selected: boolean;
  date: string;
  description: string;
  amount: number;
  type?: TransactionType;
  direction?: TransactionType;
  currency: Currency;
  category?: string;
  inferredCategory?: string;
  subCategory?: string;
  sourceAccountId?: string;
  inferredAccountId?: string;
  isDuplicate?: boolean;
  duplicateConfidence?: number;
  duplicateMatchId?: string;
}

export interface PotentialDuplicateMatch {
  existingTransaction?: Transaction;
  existingTx?: Transaction;
  incomingTransaction?: Partial<Transaction>;
  incomingDraft?: Partial<Transaction>;
  matchReason: string;
  confidenceScore?: number;
  dateDiffDays?: number;
  amountDiffPercent?: number;
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
  issueType: 'STRING_AMOUNT' | 'SHIFTED_COLUMN' | 'MISSING_DATE' | 'EXTRACTED_PHONE' | 'TRUNCATED_ROW' | 'CLONED_BLOCK' | 'FORMULA_PARSED';
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
  monthlyBlocks?: MonthlyBlock[];
  duplicateBlocks?: Array<{
    originalBlock: MonthlyBlock;
    clonedBlock: MonthlyBlock;
    resolvedAction?: 'DISCARD_DUPLICATE' | 'KEEP_BOTH' | 'MERGE';
  }>;
}
