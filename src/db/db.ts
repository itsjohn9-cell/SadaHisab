import Dexie, { Table } from 'dexie';
import { 
  Account, 
  Transaction, 
  FXRate, 
  KhumsSnapshot, 
  Sponsorship, 
  MerchantRule, 
  RosterItem, 
  RosterBatchDraftItem 
} from '../types';
import { 
  DEFAULT_ACCOUNTS, 
  DEFAULT_FX_RATES, 
  HISTORICAL_KHUMS_SNAPSHOTS, 
  DEFAULT_SPONSORSHIPS,
  DEFAULT_MERCHANT_RULES,
  DEFAULT_ROSTER_ITEMS
} from './defaultData';
import { convertToPKR } from '../services/fxService';

export interface AppSetting {
  key: string;
  value: any;
}

export class SadaHisabDatabase extends Dexie {
  accounts!: Table<Account, string>;
  transactions!: Table<Transaction, string>;
  fx_rates!: Table<FXRate, string>;
  khums_snapshots!: Table<KhumsSnapshot, number>;
  sponsorships!: Table<Sponsorship, string>;
  merchant_rules!: Table<MerchantRule, string>;
  roster_items!: Table<RosterItem, string>;
  app_settings!: Table<AppSetting, string>;

  constructor() {
    super('SadaHisabDB');
    this.version(2).stores({
      accounts: 'id, name, type, currency, isCustodial, isKhumsExempt, country, isSampleData',
      transactions: 'id, date, type, currency, category, status, isSampleData, sourceAccountId, destinationAccountId, rosterBatchMonth',
      fx_rates: 'currency, baseCurrency',
      khums_snapshots: 'year, cutoffDate, isLocked, isSampleData',
      sponsorships: 'id, category, active, dueDay',
      merchant_rules: 'id, keyword, category, defaultAccountId',
      roster_items: 'id, name, category, defaultDay, isActive',
      app_settings: 'key'
    });
  }
}

export const db = new SadaHisabDatabase();

// Seed initial default accounts, FX rates, historical snapshots, merchant rules and roster items
export async function initializeDatabase() {
  const accountCount = await db.accounts.count();
  if (accountCount === 0) {
    await db.accounts.bulkAdd(DEFAULT_ACCOUNTS);
  }

  const fxCount = await db.fx_rates.count();
  if (fxCount === 0) {
    await db.fx_rates.bulkAdd(DEFAULT_FX_RATES);
  }

  const khumsCount = await db.khums_snapshots.count();
  if (khumsCount === 0) {
    await db.khums_snapshots.bulkAdd(HISTORICAL_KHUMS_SNAPSHOTS);
  }

  const sponsCount = await db.sponsorships.count();
  if (sponsCount === 0) {
    await db.sponsorships.bulkAdd(DEFAULT_SPONSORSHIPS);
  }

  const rulesCount = await db.merchant_rules.count();
  if (rulesCount === 0) {
    await db.merchant_rules.bulkAdd(DEFAULT_MERCHANT_RULES);
  }

  const rosterCount = await db.roster_items.count();
  if (rosterCount === 0) {
    await db.roster_items.bulkAdd(DEFAULT_ROSTER_ITEMS);
  }

  // Initialize blocked OTP counter
  const otpSetting = await db.app_settings.get('blockedOTPsCount');
  if (!otpSetting) {
    await db.app_settings.put({ key: 'blockedOTPsCount', value: 0 });
  }
}

// Security: Increment Blocked OTPs Protected Counter
export async function incrementBlockedOTPCounter(): Promise<number> {
  const current = await db.app_settings.get('blockedOTPsCount');
  const count = (current ? Number(current.value) : 0) + 1;
  await db.app_settings.put({ key: 'blockedOTPsCount', value: count });
  return count;
}

export async function getBlockedOTPCounter(): Promise<number> {
  const current = await db.app_settings.get('blockedOTPsCount');
  return current ? Number(current.value) : 0;
}

// Learn or update a merchant rule permanently
export async function learnMerchantRule(
  keyword: string,
  category: string,
  subCategory?: string,
  defaultAccountId?: string
): Promise<MerchantRule> {
  const existing = await db.merchant_rules.where('keyword').equalsIgnoreCase(keyword.trim()).first();
  
  const rule: MerchantRule = {
    id: existing ? existing.id : `rule-${Date.now()}`,
    keyword: keyword.trim(),
    category: category.trim(),
    subCategory: subCategory?.trim() || undefined,
    defaultAccountId,
    matchCount: existing ? (existing.matchCount || 0) + 1 : 1,
    createdAt: existing ? existing.createdAt : new Date().toISOString()
  };

  await db.merchant_rules.put(rule);
  return rule;
}

// 1-Click Commit Monthly Recurring Batch
export async function commitRosterBatch(
  monthStr: string, // e.g. "2026-11"
  items: RosterBatchDraftItem[]
): Promise<{ count: number; totalPKR: number }> {
  const transactionsToCreate: Transaction[] = [];
  let totalPKR = 0;

  for (const item of items) {
    if (!item.selected) continue;

    const dayStr = String(item.defaultDay || 1).padStart(2, '0');
    const txDate = `${monthStr}-${dayStr}`;

    const converted = await convertToPKR(item.adjustedAmount, item.currency);
    totalPKR += converted.amountPKR;

    const tx: Transaction = {
      id: `roster-tx-${item.id}-${monthStr}-${Date.now()}`,
      date: txDate,
      type: item.category.toLowerCase().includes('income') ? 'INCOME' : 'EXPENSE',
      amount: item.adjustedAmount,
      currency: item.currency,
      convertedAmountPKR: converted.amountPKR,
      fxRateUsed: converted.fxRate,
      category: item.category,
      subCategory: item.subCategory,
      merchantOrRecipient: item.name,
      sourceAccountId: item.sourceAccountId,
      beneficiaryPhone: item.beneficiaryPhone,
      paymentChannel: item.paymentChannel,
      description: item.adjustmentNote ? `[Batch ${monthStr}] ${item.adjustmentNote}` : `Monthly recurring roster: ${monthStr}`,
      status: 'CONFIRMED',
      rosterBatchMonth: monthStr
    };

    transactionsToCreate.push(tx);

    // Update roster item lastCommittedMonth
    await db.roster_items.update(item.id, {
      lastCommittedMonth: monthStr
    });
  }

  if (transactionsToCreate.length > 0) {
    await db.transactions.bulkAdd(transactionsToCreate);
    await recalculateAllAccountBalances();
  }

  return {
    count: transactionsToCreate.length,
    totalPKR
  };
}

// Recalculate account balances based on initialBalance + all non-sample or sample transactions
export async function recalculateAllAccountBalances() {
  const accounts = await db.accounts.toArray();
  const transactions = await db.transactions.toArray();

  for (const acc of accounts) {
    let balance = Number(acc.initialBalance || 0);

    for (const tx of transactions) {
      if (tx.sourceAccountId === acc.id) {
        if (tx.type === 'EXPENSE' || tx.type === 'CREDIT_CARD_PAYMENT') {
          balance -= Number(tx.amount || 0);
        } else if (tx.type === 'TRANSFER') {
          balance -= Number(tx.amount || 0);
        } else if (tx.type === 'CREDIT_CARD_SWIPE') {
          balance -= Number(tx.amount || 0);
        }
      }

      if (tx.destinationAccountId === acc.id) {
        if (tx.type === 'TRANSFER' || tx.type === 'INCOME' || tx.type === 'CREDIT_CARD_PAYMENT') {
          balance += Number(tx.amount || 0);
        }
      }
    }

    await db.accounts.update(acc.id, {
      currentBalance: Math.round(balance * 100) / 100,
      updatedAt: new Date().toISOString()
    });
  }
}

// 1-Click Load Realistic Sample Data
export async function loadSampleData() {
  await clearSampleData();

  const sampleTransactions: Transaction[] = [
    // UAE ADCB Income & Expenses
    {
      id: 'sample-tx-1',
      date: '2026-10-28',
      type: 'INCOME',
      amount: 14500,
      currency: 'AED',
      convertedAmountPKR: 14500 * 74.31,
      fxRateUsed: 74.31,
      category: 'Salary',
      subCategory: 'Direct Deposit',
      merchantOrRecipient: 'UAE Employer Payroll',
      sourceAccountId: undefined,
      destinationAccountId: 'adcb-aed',
      description: 'Monthly salary credit ADCB account',
      status: 'CONFIRMED',
      isSampleData: true
    },
    {
      id: 'sample-tx-2',
      date: '2026-10-30',
      type: 'EXPENSE',
      amount: 470.27,
      currency: 'AED',
      convertedAmountPKR: 470.27 * 74.31,
      fxRateUsed: 74.31,
      category: 'Groceries',
      subCategory: 'Supermarket',
      merchantOrRecipient: 'Lulu Hypermarket Khalidiyah',
      sourceAccountId: 'adcb-aed',
      description: 'Monthly household grocery stock (healed from dn 470.27)',
      status: 'CONFIRMED',
      isSampleData: true,
      healingNotes: ['Healed prefix: "dn 470.27" -> 470.27 AED']
    },
    {
      id: 'sample-tx-3',
      date: '2026-11-01',
      type: 'EXPENSE',
      amount: 365.87,
      currency: 'AED',
      convertedAmountPKR: 365.87 * 74.31,
      fxRateUsed: 74.31,
      category: 'Utilities',
      subCategory: 'Electricity & Water',
      merchantOrRecipient: 'ADDC Abu Dhabi Distribution Co',
      sourceAccountId: 'adcb-aed',
      description: 'Monthly utility bill (healed from dh 365.87)',
      status: 'CONFIRMED',
      isSampleData: true,
      healingNotes: ['Healed prefix: "dh 365.87" -> 365.87 AED']
    },
    // Pakistan Sponsorships via Easypaisa & Al Habib
    {
      id: 'sample-tx-4',
      date: '2026-11-02',
      type: 'EXPENSE',
      amount: 8500,
      currency: 'PKR',
      convertedAmountPKR: 8500,
      fxRateUsed: 1.0,
      category: 'Charity & Sponsorships',
      subCategory: 'School Fees',
      merchantOrRecipient: 'Mustafa School Fee - 03123456789',
      sourceAccountId: 'easypaisa-pkr',
      beneficiaryPhone: '03123456789',
      paymentChannel: 'Easypaisa',
      description: 'Class 9 student sponsorship fees',
      status: 'CONFIRMED',
      isSampleData: true,
      healingNotes: ['Extracted beneficiary mobile: 03123456789']
    },
    {
      id: 'sample-tx-5',
      date: '2026-11-03',
      type: 'EXPENSE',
      amount: 15000,
      currency: 'PKR',
      convertedAmountPKR: 15000,
      fxRateUsed: 1.0,
      category: 'Charity & Sponsorships',
      subCategory: "Maulana's",
      merchantOrRecipient: "Maulana Monthly Wazeefa - 03009876543",
      sourceAccountId: 'jazzcash-pkr',
      beneficiaryPhone: '03009876543',
      paymentChannel: 'JazzCash',
      description: 'Monthly religious teaching wazeefa',
      status: 'CONFIRMED',
      isSampleData: true,
      healingNotes: ['Extracted beneficiary mobile: 03009876543']
    },
    {
      id: 'sample-tx-6',
      date: '2026-11-04',
      type: 'EXPENSE',
      amount: 6200,
      currency: 'PKR',
      convertedAmountPKR: 6200,
      fxRateUsed: 1.0,
      category: 'Charity & Sponsorships',
      subCategory: 'FBIS Exam Fees',
      merchantOrRecipient: 'Federal Board Exam Fee',
      sourceAccountId: 'al-habib-pkr',
      beneficiaryPhone: '03335551212',
      paymentChannel: 'Bank Transfer',
      description: 'Intermediate exam board fee',
      status: 'CONFIRMED',
      isSampleData: true
    },
    {
      id: 'sample-tx-7',
      date: '2026-11-04',
      type: 'TRANSFER',
      amount: 3000,
      currency: 'AED',
      convertedAmountPKR: 3000 * 74.31,
      fxRateUsed: 74.31,
      category: 'Remittance',
      subCategory: 'Home Remittance',
      merchantOrRecipient: 'Self Transfer ADCB to Al Habib PKR',
      sourceAccountId: 'adcb-aed',
      destinationAccountId: 'al-habib-pkr',
      description: 'Remittance for household maintenance & sponsorships',
      status: 'CONFIRMED',
      isSampleData: true
    },
    {
      id: 'sample-tx-8',
      date: '2026-11-05',
      type: 'INCOME',
      amount: 1800,
      currency: 'USD',
      convertedAmountPKR: 1800 * 275.53,
      fxRateUsed: 275.53,
      category: 'Freelance & Consulting',
      subCategory: 'Software Architecture',
      merchantOrRecipient: 'US Client Remittance',
      sourceAccountId: undefined,
      destinationAccountId: 'wise-usd',
      description: 'Consulting milestone payout',
      status: 'CONFIRMED',
      isSampleData: true
    },
    {
      id: 'sample-tx-9',
      date: '2026-11-06',
      type: 'EXPENSE',
      amount: 2700,
      currency: 'PKR',
      convertedAmountPKR: 2700,
      fxRateUsed: 1.0,
      category: 'Household',
      subCategory: 'Water Delivery',
      merchantOrRecipient: 'Sufi Water Can delivery',
      sourceAccountId: 'al-habib-pkr',
      lastMonthReferenceAmount: 2700,
      description: 'Healed row: Currency shifted to PKR, numerical income source preserved as reference amount',
      status: 'NEEDS_REVIEW',
      isSampleData: true,
      healingNotes: [
        'Shifted column fixed: "PKR" restored to Currency',
        'Numeric reference "2700" preserved from source cell',
        'Flagged for review because date was inferred from adjacent row'
      ]
    },
    {
      id: 'sample-tx-10',
      date: '2026-11-06',
      type: 'INCOME',
      amount: 5000,
      currency: 'PKR',
      convertedAmountPKR: 5000,
      fxRateUsed: 1.0,
      category: 'Gift & Eidi',
      subCategory: 'Children Galla',
      merchantOrRecipient: 'Grandparents Eidi',
      destinationAccountId: 'cupboard-children-galla',
      description: 'Eidi savings for kids piggy bank (Amanat/Custodial)',
      status: 'CONFIRMED',
      isSampleData: true
    }
  ];

  await db.transactions.bulkAdd(sampleTransactions);
  await recalculateAllAccountBalances();
}

// 1-Click Clear Sample Data
export async function clearSampleData() {
  await db.transactions.where('isSampleData').equals(1).delete();
  await db.transactions.filter(tx => tx.isSampleData === true).delete();
  await recalculateAllAccountBalances();
}
