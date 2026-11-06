import Dexie, { Table } from 'dexie';
import { Account, Transaction, FXRate, KhumsSnapshot, Sponsorship } from '../types';
import { DEFAULT_ACCOUNTS, DEFAULT_FX_RATES, HISTORICAL_KHUMS_SNAPSHOTS, DEFAULT_SPONSORSHIPS } from './defaultData';

export class SadaHisabDatabase extends Dexie {
  accounts!: Table<Account, string>;
  transactions!: Table<Transaction, string>;
  fx_rates!: Table<FXRate, string>;
  khums_snapshots!: Table<KhumsSnapshot, number>;
  sponsorships!: Table<Sponsorship, string>;

  constructor() {
    super('SadaHisabDB');
    this.version(1).stores({
      accounts: 'id, name, type, currency, isCustodial, isKhumsExempt, country, isSampleData',
      transactions: 'id, date, type, currency, category, status, isSampleData, sourceAccountId, destinationAccountId',
      fx_rates: 'currency, baseCurrency',
      khums_snapshots: 'year, cutoffDate, isLocked, isSampleData',
      sponsorships: 'id, category, active, dueDay'
    });
  }
}

export const db = new SadaHisabDatabase();

// Seed initial default accounts, FX rates and historical snapshots
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
          // For credit card liability, swipe increases liability (so decreases negative balance)
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
  // Clear any existing sample data first to avoid duplicates
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
    // Remittance / Transfer from UAE to PKR
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
    // Wise USD Consulting Income
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
    // Row flagged for Needs Review (Healed Shifted Column)
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
    // Custodial Children Galla Deposit (Excluded from Khums)
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
