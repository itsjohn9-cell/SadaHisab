import { Account, FXRate, KhumsSnapshot, Sponsorship, MerchantRule, RosterItem } from '../types';

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
    notes: 'Primary PKR operational account for salary & local transfers'
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

  // UAE Bank
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

  // Digital Wallets (International)
  {
    id: 'wise-usd',
    name: 'Wise (USD)',
    type: 'DIGITAL_WALLET',
    currency: 'USD',
    initialBalance: 3200,
    currentBalance: 3200,
    isCustodial: false,
    isKhumsExempt: false,
    country: 'INTL',
    notes: 'Wise Multi-Currency wallet'
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
    initialBalance: -4500, // Liability
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
    notes: 'Physical USD notes in drawer'
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
    notes: 'Dirhams cash in home locker'
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
    updatedAt: new Date().toISOString()
  },
  {
    currency: 'USD',
    baseCurrency: 'PKR',
    liveRate: 276.53,
    spreadAdjustment: -1.0,
    effectiveRate: 275.53,
    updatedAt: new Date().toISOString()
  },
  {
    currency: 'AED',
    baseCurrency: 'PKR',
    liveRate: 75.31,
    spreadAdjustment: -1.0,
    effectiveRate: 74.31,
    updatedAt: new Date().toISOString()
  },
  {
    currency: 'SAR',
    baseCurrency: 'PKR',
    liveRate: 73.68,
    spreadAdjustment: -1.0,
    effectiveRate: 72.68,
    updatedAt: new Date().toISOString()
  },
  {
    currency: 'GBP',
    baseCurrency: 'PKR',
    liveRate: 372.13,
    spreadAdjustment: -1.0,
    effectiveRate: 371.13,
    updatedAt: new Date().toISOString()
  },
  {
    currency: 'MYR',
    baseCurrency: 'PKR',
    liveRate: 68.35,
    spreadAdjustment: -1.0,
    effectiveRate: 67.35,
    updatedAt: new Date().toISOString()
  },
  {
    currency: 'IQD',
    baseCurrency: 'PKR',
    liveRate: 0.21,
    spreadAdjustment: 0.0,
    effectiveRate: 0.21,
    updatedAt: new Date().toISOString()
  }
];

export const HISTORICAL_KHUMS_SNAPSHOTS: KhumsSnapshot[] = [
  {
    year: 2016,
    cutoffDate: '2016-11-30',
    totalSavingsPKR: 1250000,
    unusedConsumables20PctPKR: 18000,
    newUnusedItems25PctPKR: 12000,
    loansGivenReceivablesPKR: 0,
    wifeAndCustodialSubtractPKR: 120000,
    pendingLiabilitiesCCSubtractPKR: 45000,
    priorYearKhumsedCapitalPKR: 0,
    netKhumsableAmountPKR: 1115000,
    khumsCalculated20PctPKR: 223000,
    extraVoluntaryPKR: 2000,
    khumsPaidPKR: 225000,
    notes: 'First audited annual Khums calculation on Nov 30 2016',
    isLocked: true
  },
  {
    year: 2018,
    cutoffDate: '2018-11-30',
    totalSavingsPKR: 1850000,
    unusedConsumables20PctPKR: 25000,
    newUnusedItems25PctPKR: 18000,
    loansGivenReceivablesPKR: 50000,
    wifeAndCustodialSubtractPKR: 180000,
    pendingLiabilitiesCCSubtractPKR: 62000,
    priorYearKhumsedCapitalPKR: 1115000,
    netKhumsableAmountPKR: 586000,
    khumsCalculated20PctPKR: 117200,
    extraVoluntaryPKR: 2800,
    khumsPaidPKR: 120000,
    notes: 'Nov 30 2018 audit. Net increase over 2016 capital.',
    isLocked: true
  },
  {
    year: 2020,
    cutoffDate: '2020-11-30',
    totalSavingsPKR: 2980000,
    unusedConsumables20PctPKR: 35000,
    newUnusedItems25PctPKR: 28000,
    loansGivenReceivablesPKR: 120000,
    wifeAndCustodialSubtractPKR: 260000,
    pendingLiabilitiesCCSubtractPKR: 85000,
    priorYearKhumsedCapitalPKR: 1701000,
    netKhumsableAmountPKR: 1117000,
    khumsCalculated20PctPKR: 223400,
    extraVoluntaryPKR: 6600,
    khumsPaidPKR: 230000,
    notes: 'Nov 30 2020: UAE and PKR savings combined',
    isLocked: true
  },
  {
    year: 2021,
    cutoffDate: '2021-11-30',
    totalSavingsPKR: 4200000,
    unusedConsumables20PctPKR: 45000,
    newUnusedItems25PctPKR: 35000,
    loansGivenReceivablesPKR: 180000,
    wifeAndCustodialSubtractPKR: 320000,
    pendingLiabilitiesCCSubtractPKR: 110000,
    priorYearKhumsedCapitalPKR: 2818000,
    netKhumsableAmountPKR: 1212000,
    khumsCalculated20PctPKR: 242400,
    extraVoluntaryPKR: 7600,
    khumsPaidPKR: 250000,
    notes: 'Nov 30 2021: Paid to representative of Marja',
    isLocked: true
  },
  {
    year: 2022,
    cutoffDate: '2022-11-30',
    totalSavingsPKR: 5850000,
    unusedConsumables20PctPKR: 52000,
    newUnusedItems25PctPKR: 40000,
    loansGivenReceivablesPKR: 240000,
    wifeAndCustodialSubtractPKR: 380000,
    pendingLiabilitiesCCSubtractPKR: 140000,
    priorYearKhumsedCapitalPKR: 4030000,
    netKhumsableAmountPKR: 1632000,
    khumsCalculated20PctPKR: 326400,
    extraVoluntaryPKR: 3600,
    khumsPaidPKR: 330000,
    notes: 'Nov 30 2022: Included foreign currency holdings converted at conservative rates',
    isLocked: true
  },
  {
    year: 2023,
    cutoffDate: '2023-11-30',
    totalSavingsPKR: 7420000,
    unusedConsumables20PctPKR: 68000,
    newUnusedItems25PctPKR: 48000,
    loansGivenReceivablesPKR: 328369,
    wifeAndCustodialSubtractPKR: 420000,
    pendingLiabilitiesCCSubtractPKR: 215000,
    priorYearKhumsedCapitalPKR: 5662000,
    netKhumsableAmountPKR: 1569369,
    khumsCalculated20PctPKR: 313873.8,
    extraVoluntaryPKR: 6126.2,
    khumsPaidPKR: 320000,
    notes: 'Nov 30 2023: 328,369 PKR family loan receivable included in khumsable assets',
    isLocked: true
  },
  {
    year: 2024,
    cutoffDate: '2024-11-30',
    totalSavingsPKR: 9150000,
    unusedConsumables20PctPKR: 75000,
    newUnusedItems25PctPKR: 55000,
    loansGivenReceivablesPKR: 328369,
    wifeAndCustodialSubtractPKR: 490000,
    pendingLiabilitiesCCSubtractPKR: 285000,
    priorYearKhumsedCapitalPKR: 7231369,
    netKhumsableAmountPKR: 1593369,
    khumsCalculated20PctPKR: 318673.8,
    extraVoluntaryPKR: 6326.2,
    khumsPaidPKR: 325000,
    notes: 'Nov 30 2024: Official certified snapshot',
    isLocked: true
  },
  {
    year: 2025,
    cutoffDate: '2025-11-30',
    totalSavingsPKR: 10850000,
    unusedConsumables20PctPKR: 82000,
    newUnusedItems25PctPKR: 62000,
    loansGivenReceivablesPKR: 328369,
    wifeAndCustodialSubtractPKR: 545000,
    pendingLiabilitiesCCSubtractPKR: 335000,
    priorYearKhumsedCapitalPKR: 8824738,
    netKhumsableAmountPKR: 1612631,
    khumsCalculated20PctPKR: 322526.2,
    extraVoluntaryPKR: 7473.8,
    khumsPaidPKR: 330000,
    notes: 'Nov 30 2025: Matching Excel workbook benchmark',
    isLocked: true
  }
];

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

// Pre-seeded Adaptive Merchant-to-Category Rules from Historical Sheet
export const DEFAULT_MERCHANT_RULES: MerchantRule[] = [
  {
    id: 'rule-stromfiber',
    keyword: 'StromFiber',
    category: 'Bill Payment',
    subCategory: 'Internet',
    defaultAccountId: 'nayapay-pkr',
    notes: 'Auto-maps StromFiber broadband invoices to Nayapay / Al Habib',
    matchCount: 14,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'rule-imtiaz',
    keyword: 'Imtiaz',
    category: 'Grocery',
    subCategory: 'Supermarket',
    defaultAccountId: 'al-habib-pkr',
    notes: 'Imtiaz Super Market groceries',
    matchCount: 28,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'rule-bread-drink',
    keyword: 'Bread + Drink',
    category: 'Grocery',
    subCategory: 'Daily Essentials',
    defaultAccountId: 'cash-wallet-pkr',
    notes: 'Daily bakery & dairy quick cash expense',
    matchCount: 42,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'rule-pso',
    keyword: 'PSO',
    category: 'Petrol',
    subCategory: 'Fuel',
    defaultAccountId: 'scb-pkr',
    notes: 'Pakistan State Oil - triggers automated liters and price/liter extraction',
    matchCount: 35,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'rule-shell',
    keyword: 'Shell',
    category: 'Petrol',
    subCategory: 'Fuel',
    defaultAccountId: 'scb-pkr',
    notes: 'Shell fuel station auto extraction',
    matchCount: 19,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'rule-green-island',
    keyword: 'Green Island',
    category: 'School',
    subCategory: 'Tuition Fee',
    defaultAccountId: 'al-habib-pkr',
    defaultAmount: 12525,
    notes: 'Green Island School standard fee (12,525 PKR)',
    matchCount: 22,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'rule-asghar-van',
    keyword: 'Asghar Bhai Van',
    category: 'Van',
    subCategory: 'School Transport',
    defaultAccountId: 'easypaisa-pkr',
    defaultAmount: 3500,
    notes: 'Monthly student van pool (3,500 PKR)',
    matchCount: 22,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'rule-muhammadi-trust',
    keyword: 'Muhammadi Welfare Trust',
    category: 'Donation',
    subCategory: 'Charity & Welfare',
    defaultAccountId: 'easypaisa-pkr',
    notes: 'Monthly charity disbursement',
    matchCount: 18,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'rule-maulana-generic',
    keyword: 'Maulana',
    category: 'Donation',
    subCategory: 'Religious Honorarium',
    defaultAccountId: 'jazzcash-pkr',
    notes: 'Religious teaching and community honorariums',
    matchCount: 25,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'rule-adcb-card',
    keyword: 'ADCB Cr.Card',
    category: 'Living Expenses',
    subCategory: 'Credit Card Swipe',
    defaultAccountId: 'credit-card-aed',
    notes: 'ADCB Credit Card daily swipes in UAE',
    matchCount: 52,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'rule-lulu',
    keyword: 'Lulu',
    category: 'Grocery',
    subCategory: 'Supermarket',
    defaultAccountId: 'adcb-aed',
    notes: 'Lulu Hypermarket UAE household supplies',
    matchCount: 30,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'rule-carrefour',
    keyword: 'Carrefour',
    category: 'Grocery',
    subCategory: 'Supermarket',
    defaultAccountId: 'adcb-aed',
    notes: 'Carrefour UAE grocery spending',
    matchCount: 24,
    createdAt: '2026-01-01T00:00:00Z'
  }
];

// Pre-seeded Monthly Recurring Roster Items (~20 Items matching Excel sheets)
export const DEFAULT_ROSTER_ITEMS: RosterItem[] = [
  // 1. School Fees & Transport
  {
    id: 'roster-green-island',
    name: 'Green Island School Fees',
    category: 'School',
    subCategory: 'Tuition Fee',
    defaultAmount: 12525,
    currency: 'PKR',
    sourceAccountId: 'al-habib-pkr',
    defaultDay: 5,
    isActive: true,
    notes: 'Standard monthly fee voucher'
  },
  {
    id: 'roster-asghar-van',
    name: 'Asghar Bhai Van Pool',
    category: 'Van',
    subCategory: 'School Transport',
    defaultAmount: 3500,
    currency: 'PKR',
    sourceAccountId: 'easypaisa-pkr',
    defaultDay: 5,
    isActive: true,
    notes: 'Student school transport monthly pick & drop'
  },
  {
    id: 'roster-mustafa-fee',
    name: 'Mustafa Student Fee',
    category: 'School',
    subCategory: 'Tuition Fee',
    defaultAmount: 8500,
    currency: 'PKR',
    sourceAccountId: 'easypaisa-pkr',
    beneficiaryPhone: '03123456789',
    paymentChannel: 'Easypaisa',
    defaultDay: 5,
    isActive: true,
    notes: 'Mustafa high school fee'
  },
  {
    id: 'roster-fatima-fbis',
    name: 'Fatima - FBIS Exam & Board Fees',
    category: 'School',
    subCategory: 'FBIS Exam Fees',
    defaultAmount: 6200,
    currency: 'PKR',
    sourceAccountId: 'al-habib-pkr',
    beneficiaryPhone: '03335551212',
    paymentChannel: 'Bank Transfer',
    defaultDay: 10,
    isActive: true,
    notes: 'Federal Board intermediate registration installment'
  },

  // 2. Religious & Community Sponsorships
  {
    id: 'roster-qalbe-ali',
    name: 'Student Fees via Maulana Qalbe Ali',
    category: 'Donation',
    subCategory: 'Student Sponsorship',
    defaultAmount: 15000,
    currency: 'PKR',
    sourceAccountId: 'jazzcash-pkr',
    beneficiaryPhone: '03009876543',
    paymentChannel: 'JazzCash',
    defaultDay: 1,
    isActive: true,
    notes: 'Monthly educational sponsorship for deserving students'
  },
  {
    id: 'roster-khatoon-khatoon',
    name: 'Khatoon Khatoon Sponsorship',
    category: 'Donation',
    subCategory: 'Family Welfare',
    defaultAmount: 6000,
    currency: 'PKR',
    sourceAccountId: 'easypaisa-pkr',
    defaultDay: 1,
    isActive: true,
    notes: 'Monthly family stipend'
  },
  {
    id: 'roster-zaibun-nisa',
    name: 'Zaibun Nisa Sponsorship',
    category: 'Donation',
    subCategory: 'Family Welfare',
    defaultAmount: 5000,
    currency: 'PKR',
    sourceAccountId: 'easypaisa-pkr',
    defaultDay: 1,
    isActive: true,
    notes: 'Monthly widow & family support'
  },
  {
    id: 'roster-muhammadi-trust',
    name: 'Muhammadi Welfare Trust',
    category: 'Donation',
    subCategory: 'Charity & Welfare',
    defaultAmount: 10000,
    currency: 'PKR',
    sourceAccountId: 'easypaisa-pkr',
    defaultDay: 1,
    isActive: true,
    notes: 'Monthly ration & medical charity'
  },
  {
    id: 'roster-lutf-latif',
    name: 'Maulana Lutf Latif Honorarium',
    category: 'Donation',
    subCategory: 'Religious Honorarium',
    defaultAmount: 12000,
    currency: 'PKR',
    sourceAccountId: 'jazzcash-pkr',
    defaultDay: 1,
    isActive: true,
    notes: 'Monthly wazeefa for community religious services'
  },
  {
    id: 'roster-syed-orphans',
    name: 'Syed Orphan Family Support',
    category: 'Donation',
    subCategory: 'Orphan Support',
    defaultAmount: 20000,
    currency: 'PKR',
    sourceAccountId: 'easypaisa-pkr',
    beneficiaryPhone: '03451122334',
    paymentChannel: 'Easypaisa',
    defaultDay: 1,
    isActive: true,
    notes: 'Monthly ration for 3 orphans'
  },

  // 3. Household Bills & Utilities
  {
    id: 'roster-stromfiber',
    name: 'StromFiber Fiber Broadband',
    category: 'Bill Payment',
    subCategory: 'Internet',
    defaultAmount: 3500,
    currency: 'PKR',
    sourceAccountId: 'nayapay-pkr',
    defaultDay: 10,
    isActive: true,
    notes: 'Home 50Mbps unlimited broadband'
  },
  {
    id: 'roster-m106-utilities',
    name: 'M106 Gas / Water / Electricity',
    category: 'Utilities',
    subCategory: 'Utility Pool',
    defaultAmount: 8500,
    currency: 'PKR',
    sourceAccountId: 'al-habib-pkr',
    defaultDay: 15,
    isActive: true,
    notes: 'Combined apartment building utility maintenance'
  },
  {
    id: 'roster-water-sufi',
    name: 'Sufi Mineral Water Cans Delivery',
    category: 'Household',
    subCategory: 'Drinking Water',
    defaultAmount: 2700,
    currency: 'PKR',
    sourceAccountId: 'cash-wallet-pkr',
    defaultDay: 20,
    isActive: true,
    notes: 'Monthly mineral water bottle delivery'
  },
  {
    id: 'roster-wife-monthly',
    name: 'Wife Monthly Household & Private Pay',
    category: 'Household',
    subCategory: 'Amanat / Personal',
    defaultAmount: 60000,
    currency: 'PKR',
    sourceAccountId: 'al-habib-pkr',
    defaultDay: 1,
    isActive: true,
    notes: 'Monthly household allowance & wife private funds (Amanat/Khums Exempt)'
  },

  // 4. UAE Recurring
  {
    id: 'roster-uae-etisalat',
    name: 'Etisalat Home Fiber (UAE)',
    category: 'Utilities',
    subCategory: 'Internet & Mobile',
    defaultAmount: 389,
    currency: 'AED',
    sourceAccountId: 'adcb-aed',
    defaultDay: 15,
    isActive: true,
    notes: 'Elife home fiber connection'
  },
  {
    id: 'roster-uae-addc',
    name: 'ADDC Electricity & Water (Abu Dhabi)',
    category: 'Utilities',
    subCategory: 'Electricity & Water',
    defaultAmount: 365.87,
    currency: 'AED',
    sourceAccountId: 'adcb-aed',
    defaultDay: 25,
    isActive: true,
    notes: 'Monthly utility bill'
  },
  {
    id: 'roster-uae-salik',
    name: 'Salik Toll Auto Recharge',
    category: 'Transport',
    subCategory: 'Toll Gate',
    defaultAmount: 100,
    currency: 'AED',
    sourceAccountId: 'credit-card-aed',
    defaultDay: 1,
    isActive: true,
    notes: 'Automatic 100 AED Salik tag top-up'
  }
];
