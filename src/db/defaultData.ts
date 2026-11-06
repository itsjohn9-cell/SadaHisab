import { 
  Account, 
  FXRate, 
  KhumsSnapshot, 
  Sponsorship, 
  MerchantRule, 
  RosterItem, 
  LoanRecord,
  CoordinatorGroup,
  KematiRecord
} from '../types';

export const DEFAULT_ACCOUNTS: Account[] = [
  // Pakistan Banks
  {
    id: 'al-habib-pkr',
    name: 'Al Habib - Rs (PKR)',
    type: 'BANK',
    currency: 'PKR',
    initialBalance: 450000,
    currentBalance: 450000,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'PK',
    notes: 'Primary PKR operational account for salary, student fees & local transfers'
  },
  {
    id: 'al-habib-usd',
    name: 'Al Habib - Do (USD)',
    type: 'BANK',
    currency: 'USD',
    initialBalance: 1250,
    currentBalance: 1250,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'PK',
    notes: 'FCY Foreign Currency Account (USD)'
  },
  {
    id: 'al-habib-gbp',
    name: 'Al Habib - Po (GBP)',
    type: 'BANK',
    currency: 'GBP',
    initialBalance: 420,
    currentBalance: 420,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'PK',
    notes: 'FCY Foreign Currency Account (Pounds)'
  },
  {
    id: 'hbl-pkr',
    name: 'HBL (PKR)',
    type: 'BANK',
    currency: 'PKR',
    initialBalance: 185000,
    currentBalance: 185000,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'PK',
    notes: 'Secondary bank account'
  },
  {
    id: 'scb-pkr',
    name: 'SCB (PKR)',
    type: 'BANK',
    currency: 'PKR',
    initialBalance: 95000,
    currentBalance: 95000,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'PK',
    notes: 'Standard Chartered Pakistan'
  },

  // UAE Bank & Cards
  {
    id: 'adcb-aed',
    name: 'ADCB (AED)',
    type: 'BANK',
    currency: 'AED',
    initialBalance: 18500,
    currentBalance: 18500,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'AE',
    notes: 'Abu Dhabi Commercial Bank UAE savings & living account'
  },
  {
    id: 'mashreq-card-aed',
    name: 'Mashreq Card (AED)',
    type: 'CREDIT_CARD',
    currency: 'AED',
    initialBalance: 0,
    currentBalance: 0,
    isCustodial: false,
    isKhumsExempt: true,
    country: 'AE',
    notes: 'Mashreq UAE credit & debit card'
  },

  // Digital Wallets (International)
  {
    id: 'wise-usd',
    name: 'Wise (USD)',
    type: 'DIGITAL_WALLET',
    currency: 'USD',
    initialBalance: 7416.60,
    currentBalance: 7416.60,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'INTL',
    notes: 'Wise Multi-Currency wallet',
    reconciliationNotes: 'Reconciled with Foreign tab tracker (7,416.60 USD recorded vs 6,716.33 USD net)'
  },
  {
    id: 'paypal-usd',
    name: 'Paypal (USD)',
    type: 'DIGITAL_WALLET',
    currency: 'USD',
    initialBalance: 450,
    currentBalance: 450,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'INTL',
    notes: 'PayPal balance'
  },
  {
    id: 'payoneer-usd',
    name: 'Payoneer (USD)',
    type: 'DIGITAL_WALLET',
    currency: 'USD',
    initialBalance: 880,
    currentBalance: 880,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'INTL',
    notes: 'Payoneer client receipts'
  },
  {
    id: 'remote-pass-usd',
    name: 'Remote Pass (USD)',
    type: 'DIGITAL_WALLET',
    currency: 'USD',
    initialBalance: 1500,
    currentBalance: 1500,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'INTL',
    notes: 'Remote contractor payroll wallet'
  },

  // Pakistan Digital Wallets & Fintech
  {
    id: 'infini-pkr',
    name: 'Infini (PKR)',
    type: 'DIGITAL_WALLET',
    currency: 'PKR',
    initialBalance: 25000,
    currentBalance: 25000,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'PK',
    notes: 'Infini debit card & wallet'
  },
  {
    id: 'nayapay-pkr',
    name: 'Nayapay (PKR)',
    type: 'DIGITAL_WALLET',
    currency: 'PKR',
    initialBalance: 42000,
    currentBalance: 42000,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'PK',
    notes: 'NayaPay daily spending & bill payments'
  },
  {
    id: 'easypaisa-pkr',
    name: 'Easypaisa (PKR)',
    type: 'DIGITAL_WALLET',
    currency: 'PKR',
    initialBalance: 16500,
    currentBalance: 16500,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'PK',
    notes: 'Easypaisa charity & fee payments'
  },
  {
    id: 'jazzcash-pkr',
    name: 'JazzCash (PKR)',
    type: 'DIGITAL_WALLET',
    currency: 'PKR',
    initialBalance: 12000,
    currentBalance: 12000,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'PK',
    notes: 'JazzCash mobile account'
  },
  {
    id: 'daraz-pkr',
    name: 'Daraz Wallet (PKR)',
    type: 'DIGITAL_WALLET',
    currency: 'PKR',
    initialBalance: 3500,
    currentBalance: 3500,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'PK',
    notes: 'Daraz eCommerce credits'
  },

  // Cash & Physical
  {
    id: 'cash-wallet-pkr',
    name: 'Cash in Wallet (PKR)',
    type: 'CASH',
    currency: 'PKR',
    initialBalance: 15000,
    currentBalance: 15000,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'PK',
    notes: 'Physical pocket cash'
  },
  {
    id: 'wallet-mix-cash',
    name: 'Currency in Wallet (Mix / USD / AED / SAR)',
    type: 'CASH',
    currency: 'PKR',
    initialBalance: 45000,
    currentBalance: 45000,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'PK',
    notes: 'Physical travel pocket wallet containing mixed small notes'
  },
  {
    id: 'petty-cash-pkr',
    name: 'Petty Cash (PKR)',
    type: 'CASH',
    currency: 'PKR',
    initialBalance: 20000,
    currentBalance: 20000,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'PK',
    notes: 'Home petty cash drawer'
  },
  {
    id: 'bond-200-pkr',
    name: '200Rs Bond (PKR)',
    type: 'PRIZE_BOND',
    currency: 'PKR',
    initialBalance: 80000,
    currentBalance: 80000,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'PK',
    notes: 'State Bank 200 PKR denomination prize bonds'
  },

  // Custodial (Excluded from Khums)
  {
    id: 'with-abu-usd',
    name: 'With Abu (USD)',
    type: 'CUSTODIAL',
    currency: 'USD',
    initialBalance: 5000,
    currentBalance: 5000,
    isCustodial: true,
    isKhumsExempt: true,
    country: 'INTL',
    notes: 'Custodial family deposit held with Abu - EXCLUDED from Khums'
  },
  {
    id: 'cupboard-children-galla',
    name: 'Cupboard - Children Galla (PKR)',
    type: 'CUSTODIAL',
    currency: 'PKR',
    initialBalance: 65000,
    currentBalance: 65000,
    isCustodial: true,
    isKhumsExempt: true,
    country: 'PK',
    notes: 'Children piggy bank & Amanat - STRICTLY EXCLUDED from Khums'
  },
  {
    id: 'wife-custodial-pkr',
    name: 'Wife Savings & Amanat (PKR)',
    type: 'CUSTODIAL',
    currency: 'PKR',
    initialBalance: 240000,
    currentBalance: 240000,
    isCustodial: true,
    isKhumsExempt: true,
    country: 'PK',
    notes: 'Wife private funds - EXCLUDED from Khums'
  },

  // Liabilities / Credit Cards
  {
    id: 'credit-card-aed',
    name: 'Credit Card (PKR/AED)',
    type: 'CREDIT_CARD',
    currency: 'AED',
    initialBalance: -4500,
    currentBalance: -4500,
    isCustodial: false,
    isKhumsExempt: true,
    country: 'AE',
    notes: 'ADCB Credit Card pending cycle liability (deductible on Nov 30)'
  },

  // Currency At Home (Foreign Cash)
  {
    id: 'home-cash-usd',
    name: 'Currency at Home (USD)',
    type: 'FOREIGN_CASH',
    currency: 'USD',
    initialBalance: 2100,
    currentBalance: 2100,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'PK',
    notes: 'Physical USD notes in drawer (travel reserve)',
    travelNotes: 'Physical cash notes in home vault'
  },
  {
    id: 'home-cash-gbp',
    name: 'Currency at Home (GBP)',
    type: 'FOREIGN_CASH',
    currency: 'GBP',
    initialBalance: 650,
    currentBalance: 650,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'PK',
    notes: 'Physical GBP bank notes'
  },
  {
    id: 'home-cash-sar',
    name: 'Currency at Home (SAR)',
    type: 'FOREIGN_CASH',
    currency: 'SAR',
    initialBalance: 1800,
    currentBalance: 1800,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'PK',
    notes: 'Saudi Riyals remaining from Umrah/Ziyarat'
  },
  {
    id: 'home-cash-aed',
    name: 'Currency at Home (AED)',
    type: 'FOREIGN_CASH',
    currency: 'AED',
    initialBalance: 2400,
    currentBalance: 2400,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'PK',
    notes: 'Dirhams cash in home locker',
    travelNotes: 'Carried during Dubai trips; remainder preserved at home'
  },
  {
    id: 'home-cash-myr',
    name: 'Currency at Home (MYR)',
    type: 'FOREIGN_CASH',
    currency: 'MYR',
    initialBalance: 1200,
    currentBalance: 1200,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'PK',
    notes: 'Malaysian Ringgit cash'
  },
  {
    id: 'home-cash-iqd',
    name: 'Currency at Home (IQD)',
    type: 'FOREIGN_CASH',
    currency: 'IQD',
    initialBalance: 250000,
    currentBalance: 250000,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'PK',
    notes: 'Iraqi Dinar notes preserved for Arbaeen pilgrimage'
  }
];

export const DEFAULT_FX_RATES: FXRate[] = [
  {
    currency: 'PKR',
    baseCurrency: 'PKR',
    liveRate: 1.0,
    spreadAdjustment: 0,
    effectiveRate: 1.0,
    snapshotRate: 1.0,
    updatedAt: new Date().toISOString()
  },
  {
    currency: 'USD',
    baseCurrency: 'PKR',
    liveRate: 276.53,
    spreadAdjustment: -1.0,
    effectiveRate: 275.53,
    snapshotRate: 278.0,
    updatedAt: new Date().toISOString()
  },
  {
    currency: 'AED',
    baseCurrency: 'PKR',
    liveRate: 75.31,
    spreadAdjustment: -1.0,
    effectiveRate: 74.31,
    snapshotRate: 75.5,
    updatedAt: new Date().toISOString()
  },
  {
    currency: 'SAR',
    baseCurrency: 'PKR',
    liveRate: 73.68,
    spreadAdjustment: -1.0,
    effectiveRate: 72.68,
    snapshotRate: 74.0,
    updatedAt: new Date().toISOString()
  },
  {
    currency: 'GBP',
    baseCurrency: 'PKR',
    liveRate: 351.20,
    spreadAdjustment: -1.0,
    effectiveRate: 350.20,
    snapshotRate: 350.0,
    updatedAt: new Date().toISOString()
  },
  {
    currency: 'MYR',
    baseCurrency: 'PKR',
    liveRate: 58.45,
    spreadAdjustment: -1.0,
    effectiveRate: 57.45,
    snapshotRate: 58.0,
    updatedAt: new Date().toISOString()
  },
  {
    currency: 'IQD',
    baseCurrency: 'PKR',
    liveRate: 0.21,
    spreadAdjustment: -0.01,
    effectiveRate: 0.20,
    snapshotRate: 0.20,
    updatedAt: new Date().toISOString()
  }
];

export const DEFAULT_KHUMS_BENCHMARKS: KhumsSnapshot[] = [
  {
    year: 2024,
    cutoffDate: '2024-11-30',
    totalSavingsPKR: 14250000,
    unusedConsumables20PctPKR: 280000,
    newUnusedItems25PctPKR: 350000,
    loansGivenReceivablesPKR: 328369,
    kematiLockedEquityPKR: 500000,
    wifeAndCustodialSubtractPKR: 305000,
    pendingLiabilitiesCCSubtractPKR: 340000,
    priorYearKhumsedCapitalPKR: 12100000,
    netKhumsableAmountPKR: 3263369,
    khumsCalculated20PctPKR: 652673.8,
    extraVoluntaryPKR: 0,
    khumsPaidPKR: 652673.8,
    totalLiquidAssetsPKR: 14250000,
    consumablesValuePKR: 280000,
    newGoodsValuePKR: 350000,
    loanReceivablesPKR: 328369,
    custodialDeductionsPKR: 305000,
    creditCardLiabilitiesPKR: 340000,
    previousPurifiedCapitalPKR: 12100000,
    khumsPayablePKR: 652673.8,
    sahmImamPKR: 326336.9,
    sahmSadatPKR: 326336.9,
    isLocked: true,
    isSampleData: false,
    notes: '2024 Verified Annual Khums Calculation'
  }
];

export const DEFAULT_MERCHANT_RULES: MerchantRule[] = [
  { id: 'rule-stromfiber', keyword: 'stromfiber', category: 'Bill Payment', subCategory: 'Internet', defaultAccountId: 'nayapay-pkr', defaultCurrency: 'PKR' },
  { id: 'rule-imtiaz', keyword: 'imtiaz', category: 'Grocery', subCategory: 'Supermarket', defaultAccountId: 'al-habib-pkr', defaultCurrency: 'PKR' },
  { id: 'rule-pso', keyword: 'pso', category: 'Petrol', subCategory: 'Fuel', defaultAccountId: 'al-habib-pkr', defaultCurrency: 'PKR' },
  { id: 'rule-green-island', keyword: 'green island', category: 'School', subCategory: 'Tuition Fee', defaultAccountId: 'al-habib-pkr', defaultCurrency: 'PKR' },
  { id: 'rule-asghar-van', keyword: 'asghar bhai', category: 'Van', subCategory: 'School Transport', defaultAccountId: 'cash-wallet-pkr', defaultCurrency: 'PKR' },
  { id: 'rule-muhammadi', keyword: 'muhammadi welfare', category: 'Donation', subCategory: 'Trust', defaultAccountId: 'al-habib-pkr', defaultCurrency: 'PKR' },
  { id: 'rule-qalbe-ali', keyword: 'qalbe ali', category: 'Donation', subCategory: 'Student Sponsorship', defaultAccountId: 'al-habib-pkr', defaultCurrency: 'PKR' },
  { id: 'rule-adcb-cc', keyword: 'adcb cr.card', category: 'Credit Card Expense', subCategory: 'Swipe', defaultAccountId: 'credit-card-aed', defaultCurrency: 'AED' },
  { id: 'rule-dewa', keyword: 'dewa', category: 'Bill Payment', subCategory: 'Utilities', defaultAccountId: 'adcb-aed', defaultCurrency: 'AED' },
  { id: 'rule-etisalat', keyword: 'etisalat', category: 'Bill Payment', subCategory: 'Telecom', defaultAccountId: 'adcb-aed', defaultCurrency: 'AED' },
  { id: 'rule-salik', keyword: 'salik', category: 'Transport', subCategory: 'Toll', defaultAccountId: 'adcb-aed', defaultCurrency: 'AED' }
];

// Pre-seeded Coordinator / Aggregator Groups
export const DEFAULT_COORDINATOR_GROUPS: CoordinatorGroup[] = [
  {
    id: 'coord-qalbe-ali',
    coordinatorName: 'Maulana Qalbe Ali',
    phone: '03165777490',
    defaultAccountId: 'al-habib-pkr',
    paymentChannel: 'Al Habib - Rs (IBFT)',
    totalMonthlyCommitment: 36950,
    notes: 'Monthly student tuition fees distributed across 10 students via Maulana Qalbe Ali',
    subItems: [
      { id: 'qa-maulana', studentName: "Maulana's", defaultAmount: 10000, subCategory: "Maulana's", notes: 'Clergy Monthly Stipend' },
      { id: 'qa-bais-ali', studentName: 'Bais Ali', defaultAmount: 2700, subCategory: 'School Fees' },
      { id: 'qa-saiqa', studentName: 'Saiqa', defaultAmount: 4500, subCategory: 'School Fees' },
      { id: 'qa-shaneela', studentName: 'Shaneela', defaultAmount: 3500, subCategory: 'School Fees' },
      { id: 'qa-hussain-mehdi', studentName: 'Hussain Mehdi', defaultAmount: 2700, subCategory: 'School Fees' },
      { id: 'qa-amir-hussain', studentName: 'Amir Hussain s/o Nasir Hussain', defaultAmount: 2950, subCategory: 'School Fees' },
      { id: 'qa-shoaib', studentName: 'Muhammad Shoaib s/o Ali Madad', defaultAmount: 2800, subCategory: 'School Fees' },
      { id: 'qa-raees', studentName: 'Raees Hassan s/o Sarfaraz Ali', defaultAmount: 2100, subCategory: 'School Fees' },
      { id: 'qa-sanullah', studentName: 'Sanullah s/o Asghar Ali', defaultAmount: 2850, subCategory: 'School Fees' },
      { id: 'qa-kumail', studentName: 'Kumail Abbas s/o Rustam Ali', defaultAmount: 2850, subCategory: 'School Fees' }
    ]
  },
  {
    id: 'coord-khatoon',
    coordinatorName: 'Khatoon Khatoon',
    phone: '03120976573',
    defaultAccountId: 'al-habib-pkr',
    paymentChannel: 'Al Habib - Rs (IBFT)',
    totalMonthlyCommitment: 11200,
    notes: 'Student tuition fees for Talib Shah family',
    subItems: [
      { id: 'kk-rashmia', studentName: 'Rashmia Talib Shah', defaultAmount: 4500, subCategory: 'School Fees', notes: 'Frequently 9,000 for 2 months advance' },
      { id: 'kk-hasnain', studentName: 'Hasnain Talib Shah', defaultAmount: 2700, subCategory: 'School Fees', notes: 'Frequently 5,400 for 2 months advance' },
      { id: 'kk-saqib', studentName: 'Saqib Ali Talib Shah', defaultAmount: 4000, subCategory: 'School Fees', notes: 'Frequently 8,000 for 2 months advance' }
    ]
  },
  {
    id: 'coord-zaibun-nisa',
    coordinatorName: 'Zaibun Nisa - Hidayat Ali',
    phone: '03185262577',
    defaultAccountId: 'al-habib-pkr',
    paymentChannel: 'Al Habib - Rs / M.S. Mobile 03541009129839',
    totalMonthlyCommitment: 11550,
    notes: 'Batool sisters education support',
    subItems: [
      { id: 'zn-zehra', studentName: 'Zehra Batool', defaultAmount: 3750, subCategory: 'School Fees' },
      { id: 'zn-azra', studentName: 'Azra Batool', defaultAmount: 2800, subCategory: 'School Fees' },
      { id: 'zn-seema', studentName: 'Seema Batool', defaultAmount: 2500, subCategory: 'School Fees' },
      { id: 'zn-hina', studentName: 'Hina', defaultAmount: 2500, subCategory: 'School Fees' }
    ]
  },
  {
    id: 'coord-shokat-ali',
    coordinatorName: 'Shokat Ali',
    phone: '03118816993',
    defaultAccountId: 'easypaisa-pkr',
    paymentChannel: 'Easypaisa',
    totalMonthlyCommitment: 3500,
    notes: 'Lubna & Aiza school education',
    subItems: [
      { id: 'sa-lubna', studentName: 'Lubna d/o Shokat Ali', defaultAmount: 2000, subCategory: 'School Fees' },
      { id: 'sa-aiza', studentName: 'Aiza d/o Shokat Ali', defaultAmount: 1500, subCategory: 'School Fees' }
    ]
  },
  {
    id: 'coord-taha-uddin',
    coordinatorName: 'Syed Taha-ud-din',
    phone: '03180802871',
    defaultAccountId: 'easypaisa-pkr',
    paymentChannel: 'Easypaisa',
    totalMonthlyCommitment: 7150,
    notes: 'Syed Bahar-ud-din family children education',
    subItems: [
      { id: 'tu-zain', studentName: 'Syed Zain-ud-din s/o Syed Bahar-ud-din', defaultAmount: 3400, subCategory: 'School Fees' },
      { id: 'tu-ali-waris', studentName: 'Syed Ali Waris s/o Syed Bahar-ud-din', defaultAmount: 3750, subCategory: 'School Fees' }
    ]
  },
  {
    id: 'coord-muhammad-syed',
    coordinatorName: 'Muhammad Syed',
    phone: '03105599042',
    defaultAccountId: 'jazzcash-pkr',
    paymentChannel: 'JazzCash',
    totalMonthlyCommitment: 8000,
    notes: 'Muhammad Ali family tuition fees',
    subItems: [
      { id: 'ms-erum', studentName: 'Erum Zehra Mohammad Ali', defaultAmount: 4500, subCategory: 'School Fees' },
      { id: 'ms-ali-shinawar', studentName: 'Ali Shinawar Muhammad Ali', defaultAmount: 3500, subCategory: 'School Fees' }
    ]
  }
];

// Pre-seeded Kemati / Committee Records
export const DEFAULT_KEMATI: KematiRecord[] = [
  {
    id: 'kemati-jhone-50k',
    name: 'Kemati 50k (Jhone)',
    monthlyAmount: 50000,
    currency: 'PKR',
    startDate: '2025-01-01',
    durationMonths: 20,
    monthsPaid: 10,
    payoutAmount: 1000000,
    expectedPayoutMonth: '2026-10',
    isPayoutReceived: false,
    includeInKhums: true,
    notes: 'Monthly 50k committee - Transfer to Locked Savings (Asset). Equity included in Nov 30 Khums calculation.'
  }
];

// Pre-seeded Recurring Monthly Roster Items
export const DEFAULT_ROSTER_ITEMS: RosterItem[] = [
  // 1. Direct Trusts & Clergy
  {
    id: 'roster-muhammadi-welfare',
    name: 'Muhammadi Welfare Trust - Noor Ali',
    category: 'Donation',
    subCategory: 'Welfare Trust',
    defaultAmount: 30000,
    currency: 'PKR',
    sourceAccountId: 'al-habib-pkr',
    defaultDay: 1,
    isActive: true,
    reminderType: 'SADAQAH_ROSTER',
    notes: 'Monthly core welfare contribution'
  },
  {
    id: 'roster-maulana-lutf',
    name: 'Maulana Lutf Latif',
    category: 'Donation',
    subCategory: "Maulana's",
    defaultAmount: 9000,
    currency: 'PKR',
    sourceAccountId: 'al-habib-pkr',
    defaultDay: 1,
    isActive: true,
    reminderType: 'SADAQAH_ROSTER',
    notes: 'Clergy Monthly Stipend'
  },
  {
    id: 'roster-saima-naim',
    name: 'Saima - Naim Uncle',
    category: 'Donation',
    subCategory: 'Family Support',
    defaultAmount: 9000,
    currency: 'PKR',
    sourceAccountId: 'al-habib-pkr',
    defaultDay: 1,
    isActive: true,
    reminderType: 'SADAQAH_ROSTER',
    notes: 'Family assistance'
  },
  {
    id: 'roster-aga-ali-hasanain',
    name: 'Aga Ali Hasanain Noorani - Basit Bojani',
    category: 'Donation',
    subCategory: 'Religious / Community',
    defaultAmount: 12000,
    currency: 'PKR',
    sourceAccountId: 'al-habib-pkr',
    defaultDay: 1,
    isActive: true,
    reminderType: 'SADAQAH_ROSTER',
    notes: 'Aga Ali Hasanain sponsorship'
  },
  {
    id: 'roster-rohia-hafiza',
    name: 'Rohia - Hafiza Rida Batool',
    category: 'Rohia',
    subCategory: 'Quran Education',
    defaultAmount: 12000,
    currency: 'PKR',
    sourceAccountId: 'al-habib-pkr',
    defaultDay: 1,
    isActive: true,
    reminderType: 'FAMILY_ALLOWANCE',
    notes: 'Rohia Quran tutoring (Frequently advance for next month)'
  },
  {
    id: 'roster-mehreen-quran',
    name: 'Mehreen - Abdullah Quran Teacher',
    category: 'Children',
    subCategory: 'Quran Teacher',
    defaultAmount: 7000,
    currency: 'PKR',
    sourceAccountId: 'al-habib-pkr',
    defaultDay: 2,
    isActive: true,
    reminderType: 'FAMILY_ALLOWANCE',
    notes: 'Kids Quran tutoring'
  },
  {
    id: 'roster-muhammad-hani',
    name: 'Muhammad Hani Asadullah',
    category: 'Donation',
    subCategory: 'Education Support',
    defaultAmount: 10500,
    currency: 'PKR',
    sourceAccountId: 'al-habib-pkr',
    defaultDay: 2,
    isActive: true,
    reminderType: 'SADAQAH_ROSTER',
    notes: 'Student tuition support'
  },
  {
    id: 'roster-hussain-abbas-hamza',
    name: 'Hussain Abbas s/o Maulana Ameer Hamza',
    category: 'Donation',
    subCategory: 'School Fees',
    defaultAmount: 2500,
    currency: 'PKR',
    sourceAccountId: 'jazzcash-pkr',
    beneficiaryPhone: '03248241703',
    defaultDay: 3,
    isActive: true,
    reminderType: 'SADAQAH_ROSTER',
    notes: '03248241703 JazzCash'
  },
  {
    id: 'roster-sharafar-hussain',
    name: 'Sharafar Hussain',
    category: 'Donation',
    subCategory: 'School Fees',
    defaultAmount: 3750,
    currency: 'PKR',
    sourceAccountId: 'easypaisa-pkr',
    beneficiaryPhone: '03165576542',
    defaultDay: 3,
    isActive: true,
    reminderType: 'SADAQAH_ROSTER',
    notes: '03165576542 Easypaisa'
  },

  // 2. Coordinator Group Transfers (Aggregates)
  {
    id: 'roster-coord-qalbe-ali',
    name: 'Maulana Qalbe Ali - 10 Students Group',
    category: 'Donation',
    subCategory: 'Student Sponsorship Roster',
    defaultAmount: 36950,
    currency: 'PKR',
    sourceAccountId: 'al-habib-pkr',
    beneficiaryPhone: '03165777490',
    defaultDay: 1,
    isActive: true,
    reminderType: 'SADAQAH_ROSTER',
    coordinatorGroupId: 'coord-qalbe-ali',
    notes: 'Lump-sum 36,950 PKR auto-splits to 10 child students in Maulana Qalbe Ali Group'
  },
  {
    id: 'roster-coord-khatoon',
    name: 'Khatoon Khatoon - 3 Students Group',
    category: 'Donation',
    subCategory: 'Student Sponsorship Roster',
    defaultAmount: 11200,
    currency: 'PKR',
    sourceAccountId: 'al-habib-pkr',
    beneficiaryPhone: '03120976573',
    defaultDay: 1,
    isActive: true,
    reminderType: 'SADAQAH_ROSTER',
    coordinatorGroupId: 'coord-khatoon',
    notes: 'Lump-sum 11,200 PKR auto-splits to Rashmia (4,500), Hasnain (2,700), Saqib (4,000)'
  },
  {
    id: 'roster-coord-zaibun-nisa',
    name: 'Zaibun Nisa - 4 Students Group',
    category: 'Donation',
    subCategory: 'Student Sponsorship Roster',
    defaultAmount: 11550,
    currency: 'PKR',
    sourceAccountId: 'al-habib-pkr',
    beneficiaryPhone: '03185262577',
    defaultDay: 2,
    isActive: true,
    reminderType: 'SADAQAH_ROSTER',
    coordinatorGroupId: 'coord-zaibun-nisa',
    notes: 'Lump-sum 11,550 PKR auto-splits to Zehra, Azra, Seema, Hina'
  },
  {
    id: 'roster-coord-shokat-ali',
    name: 'Shokat Ali - 2 Students Group',
    category: 'Donation',
    subCategory: 'Student Sponsorship Roster',
    defaultAmount: 3500,
    currency: 'PKR',
    sourceAccountId: 'easypaisa-pkr',
    beneficiaryPhone: '03118816993',
    defaultDay: 2,
    isActive: true,
    reminderType: 'SADAQAH_ROSTER',
    coordinatorGroupId: 'coord-shokat-ali',
    notes: 'Auto-splits to Lubna (2,000) and Aiza (1,500)'
  },
  {
    id: 'roster-coord-taha-uddin',
    name: 'Syed Taha-ud-din - 2 Students Group',
    category: 'Donation',
    subCategory: 'Student Sponsorship Roster',
    defaultAmount: 7150,
    currency: 'PKR',
    sourceAccountId: 'easypaisa-pkr',
    beneficiaryPhone: '03180802871',
    defaultDay: 3,
    isActive: true,
    reminderType: 'SADAQAH_ROSTER',
    coordinatorGroupId: 'coord-taha-uddin',
    notes: 'Auto-splits to Syed Zain-ud-din (3,400) and Syed Ali Waris (3,750)'
  },
  {
    id: 'roster-coord-muhammad-syed',
    name: 'Muhammad Syed - 2 Students Group',
    category: 'Donation',
    subCategory: 'Student Sponsorship Roster',
    defaultAmount: 8000,
    currency: 'PKR',
    sourceAccountId: 'jazzcash-pkr',
    beneficiaryPhone: '03105599042',
    defaultDay: 3,
    isActive: true,
    reminderType: 'SADAQAH_ROSTER',
    coordinatorGroupId: 'coord-muhammad-syed',
    notes: 'Auto-splits to Erum Zehra (4,500) and Ali Shinawar (3,500)'
  },

  // 3. Family Allowances & Kemati (ROSCA)
  {
    id: 'roster-wife-monthly',
    name: 'Wife Monthly Pay (Dual Currency)',
    category: 'Wife',
    subCategory: 'Monthly Pay',
    defaultAmount: 350,
    currency: 'AED',
    sourceAccountId: 'adcb-aed',
    defaultDay: 1,
    isActive: true,
    reminderType: 'FAMILY_ALLOWANCE',
    isWifeDualCurrency: true,
    notes: 'Dual Currency Rule: 350 AED in UAE (ADCB) or 14,000 / 18,000 PKR in Pakistan (Al Habib)'
  },
  {
    id: 'roster-kemati-50k',
    name: 'Kemati 50k (Jhone)',
    category: 'Jhone',
    subCategory: 'Kemati',
    defaultAmount: 50000,
    currency: 'PKR',
    sourceAccountId: 'al-habib-pkr',
    defaultDay: 5,
    isActive: true,
    reminderType: 'FAMILY_ALLOWANCE',
    notes: 'Monthly 50k Committee (ROSCA) - Transfer to Locked Savings (Asset). Equity included in Khums.'
  },

  // 4. Education & Van
  {
    id: 'roster-green-island',
    name: 'Green Island School (Children Fees)',
    category: 'School',
    subCategory: 'School Fees',
    defaultAmount: 12525,
    currency: 'PKR',
    sourceAccountId: 'al-habib-pkr',
    defaultDay: 10,
    isActive: true,
    reminderType: 'EDUCATION',
    notes: 'School tuition for kids'
  },
  {
    id: 'roster-asghar-van',
    name: 'Asghar Bhai Van (School Transport)',
    category: 'Van',
    subCategory: 'School Van',
    defaultAmount: 3500,
    currency: 'PKR',
    sourceAccountId: 'cash-wallet-pkr',
    defaultDay: 5,
    isActive: true,
    reminderType: 'EDUCATION',
    notes: 'School transport fee'
  },

  // 5. Fixed Utilities (PK & UAE)
  {
    id: 'roster-stromfiber',
    name: 'StromFiber Home Fiber Internet',
    category: 'Bill Payment',
    subCategory: 'Internet',
    defaultAmount: 4460,
    currency: 'PKR',
    sourceAccountId: 'nayapay-pkr',
    defaultDay: 5,
    isActive: true,
    isBillReminder: true,
    reminderType: 'FIXED_BILL',
    lastMonthAmount: 4460,
    notes: 'Monthly fiber internet bill'
  },
  {
    id: 'roster-dewa-uae',
    name: 'DEWA / ADDC Electricity & Water',
    category: 'Bill Payment',
    subCategory: 'Dewa',
    defaultAmount: 340,
    currency: 'AED',
    sourceAccountId: 'adcb-aed',
    defaultDay: 15,
    isActive: true,
    isBillReminder: true,
    reminderType: 'FIXED_BILL',
    lastMonthAmount: 340,
    notes: 'UAE utility bill'
  },
  {
    id: 'roster-etisalat-internet',
    name: 'Etisalat Internet (Home Fiber)',
    category: 'Bill Payment',
    subCategory: 'Etisalat Internet',
    defaultAmount: 389,
    currency: 'AED',
    sourceAccountId: 'adcb-aed',
    defaultDay: 20,
    isActive: true,
    isBillReminder: true,
    reminderType: 'FIXED_BILL',
    lastMonthAmount: 389,
    notes: 'UAE home broadband'
  },
  {
    id: 'roster-royal-gas',
    name: 'Royal Gas Centralized LPG',
    category: 'Bill Payment',
    subCategory: 'Royal Gas',
    defaultAmount: 75,
    currency: 'AED',
    sourceAccountId: 'adcb-aed',
    defaultDay: 18,
    isActive: true,
    isBillReminder: true,
    reminderType: 'FIXED_BILL',
    lastMonthAmount: 75,
    notes: 'Centralized gas utility'
  },
  {
    id: 'roster-etisalat-recharge',
    name: 'Etisalat Mobile Recharge (Postpaid/Prepaid)',
    category: 'Bill Payment',
    subCategory: 'Etisalat Recharge',
    defaultAmount: 48,
    currency: 'AED',
    sourceAccountId: 'adcb-aed',
    defaultDay: 1,
    isActive: true,
    isBillReminder: true,
    reminderType: 'FIXED_BILL',
    lastMonthAmount: 48,
    notes: 'Mobile SIM connection'
  }
];

// Pre-seeded Default Loan Records
export const DEFAULT_LOANS: LoanRecord[] = [
  {
    id: 'loan-family-328k',
    type: 'LENT_RECEIVABLE',
    counterpartyName: 'Family Member (Personal Loan)',
    relationship: 'Immediate Family',
    originalAmount: 328369,
    remainingAmount: 328369,
    currency: 'PKR',
    lentDate: '2023-04-15',
    dueDate: '2026-12-31',
    isRecoverable: true, // Included in Khums
    notes: 'Longstanding family loan (Rs. 328,369) active in workbook Khums audits since 2023',
    repayments: []
  },
  {
    id: 'loan-borrowed-emergency',
    type: 'BORROWED_LIABILITY',
    counterpartyName: 'Short-Term Community Loan Taken',
    relationship: 'Friend',
    originalAmount: 50000,
    remainingAmount: 50000,
    currency: 'PKR',
    lentDate: '2026-09-01',
    dueDate: '2026-11-25',
    isRecoverable: true,
    notes: 'Pending liability to be settled before Nov 30 (deducted from Khums savings)',
    repayments: []
  }
];

export const HISTORICAL_KHUMS_SNAPSHOTS: KhumsSnapshot[] = DEFAULT_KHUMS_BENCHMARKS;

export const DEFAULT_SPONSORSHIPS: Sponsorship[] = [
  {
    id: 'spons-1',
    name: 'Mustafa - School Fees',
    category: 'STUDENT_FEE',
    monthlyAmount: 8500,
    currency: 'PKR',
    recipientPhone: '03123456789',
    preferredChannel: 'Easypaisa',
    dueDay: 5,
    active: true,
    notes: 'Class 9 Tuition & Transport fees',
    lastPaidDate: '2026-10-05'
  },
  {
    id: 'spons-2',
    name: 'Maulana Monthly Wazeefa',
    category: 'RELIGIOUS',
    monthlyAmount: 15000,
    currency: 'PKR',
    recipientPhone: '03009876543',
    preferredChannel: 'JazzCash',
    dueDay: 1,
    active: true,
    notes: 'Monthly honorarium / sponsorship',
    lastPaidDate: '2026-11-01'
  },
  {
    id: 'spons-3',
    name: 'Fatima - FBIS Exam Fees',
    category: 'STUDENT_FEE',
    monthlyAmount: 6200,
    currency: 'PKR',
    recipientPhone: '03335551212',
    preferredChannel: 'Al Habib Transfer',
    dueDay: 10,
    active: true,
    notes: 'Federal Board annual registration & tuition installment',
    lastPaidDate: '2026-10-10'
  },
  {
    id: 'spons-4',
    name: 'Syed Orphan Family Support',
    category: 'FAMILY_SUPPORT',
    monthlyAmount: 20000,
    currency: 'PKR',
    recipientPhone: '03451122334',
    preferredChannel: 'Easypaisa',
    dueDay: 1,
    active: true,
    notes: 'Monthly ration & medical allowance for 3 orphans',
    lastPaidDate: '2026-11-01'
  }
];
