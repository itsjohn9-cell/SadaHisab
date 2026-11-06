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
  updatedAt?: string;
}

export type TransactionType = 
  | 'EXPENSE' 
  | 'INCOME' 
  | 'TRANSFER' 
  | 'CREDIT_CARD_SWIPE' 
  | 'CREDIT_CARD_PAYMENT';

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
  cutoffDate: string; // YYYY-11-30
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
  keyword: string; // e.g. 'StromFiber', 'PSO', 'Green Island'
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
  name: string; // e.g., 'Green Island School', 'Asghar Bhai Van', 'Maulana Qalbe Ali'
  category: string;
  subCategory?: string;
  defaultAmount: number;
  currency: Currency;
  sourceAccountId: string;
  beneficiaryPhone?: string;
  paymentChannel?: string;
  defaultDay: number; // e.g., 1st or 5th
  notes?: string;
  isActive: boolean;
  lastCommittedMonth?: string; // e.g., '2026-10'
}

export interface RosterBatchDraftItem extends RosterItem {
  selected: boolean;
  adjustedAmount: number;
  adjustmentNote?: string;
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
