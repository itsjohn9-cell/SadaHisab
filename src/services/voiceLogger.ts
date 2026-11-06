import { Currency, TransactionType } from '../types';

export interface ParsedVoiceResult {
  rawTranscript: string;
  amount: number;
  currency: Currency;
  direction: TransactionType;
  category: string;
  subCategory?: string;
  merchantOrRecipient: string;
  inferredAccountId: string;
  destinationAccountId?: string;
  confidence: 'HIGH' | 'MEDIUM';
}

// Check if Speech Recognition is supported in the browser
export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

// Parse spoken financial statements in English / Urdu / Arabic loanwords
export function parseVoiceTranscript(transcript: string): ParsedVoiceResult {
  const clean = transcript.trim();
  const lower = clean.toLowerCase();

  let currency: Currency = 'PKR';
  let amount = 0;
  let direction: TransactionType = 'EXPENSE';
  let category = 'General Expense';
  let subCategory: string | undefined;
  let merchant = 'Voice Logged Entry';
  let inferredAccountId = 'al-habib-pkr';
  let destinationAccountId: string | undefined;

  // 1. Detect Direction
  if (lower.includes('received') || lower.includes('credited') || lower.includes('got salary') || lower.includes('income')) {
    direction = 'INCOME';
    category = 'Salary & Inflow';
  } else if (lower.includes('transferred') || lower.includes('transfer') || lower.includes('sent from')) {
    direction = 'TRANSFER';
    category = 'Remittance / Transfer';
  } else {
    direction = 'EXPENSE';
  }

  // 2. Detect Currency
  if (lower.includes('dirham') || lower.includes('dirhams') || lower.includes('aed') || lower.includes('dh')) {
    currency = 'AED';
    inferredAccountId = 'adcb-aed';
  } else if (lower.includes('dollar') || lower.includes('dollars') || lower.includes('usd') || lower.includes('bucks')) {
    currency = 'USD';
    inferredAccountId = 'wise-usd';
  } else if (lower.includes('pound') || lower.includes('pounds') || lower.includes('gbp')) {
    currency = 'GBP';
    inferredAccountId = 'al-habib-gbp';
  } else if (lower.includes('riyal') || lower.includes('sar')) {
    currency = 'SAR';
  } else {
    currency = 'PKR';
    inferredAccountId = 'al-habib-pkr';
  }

  // 3. Extract Amount
  // Convert spoken decimal: e.g. "365 point 87" -> "365.87"
  const normalizedNumbers = lower
    .replace(/point/g, '.')
    .replace(/,/g, '');

  const amountMatch = normalizedNumbers.match(/(\d+(?:\.\d+)?)/);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1]) || 0;
  }

  // 4. Detect Accounts & Wallets
  if (lower.includes('adcb')) {
    inferredAccountId = 'adcb-aed';
  } else if (lower.includes('al habib') || lower.includes('habib')) {
    inferredAccountId = 'al-habib-pkr';
  } else if (lower.includes('scb') || lower.includes('standard chartered')) {
    inferredAccountId = 'scb-pkr';
  } else if (lower.includes('hbl')) {
    inferredAccountId = 'hbl-pkr';
  } else if (lower.includes('nayapay') || lower.includes('naya pay')) {
    inferredAccountId = 'nayapay-pkr';
  } else if (lower.includes('easypaisa') || lower.includes('easy paisa')) {
    inferredAccountId = 'easypaisa-pkr';
  } else if (lower.includes('jazzcash') || lower.includes('jazz cash')) {
    inferredAccountId = 'jazzcash-pkr';
  } else if (lower.includes('wise')) {
    inferredAccountId = 'wise-usd';
  } else if (lower.includes('wallet') || lower.includes('cash')) {
    inferredAccountId = 'cash-wallet-pkr';
  } else if (lower.includes('credit card') || lower.includes('card')) {
    inferredAccountId = currency === 'AED' ? 'credit-card-aed' : 'scb-pkr';
    if (direction === 'EXPENSE') direction = 'CREDIT_CARD_SWIPE';
  }

  // Transfer destination
  if (direction === 'TRANSFER') {
    if (lower.includes('to scb')) destinationAccountId = 'scb-pkr';
    else if (lower.includes('to al habib') || lower.includes('to habib')) destinationAccountId = 'al-habib-pkr';
    else if (lower.includes('to nayapay')) destinationAccountId = 'nayapay-pkr';
    else if (lower.includes('to easypaisa')) destinationAccountId = 'easypaisa-pkr';
  }

  // 5. Detect Merchant & Category
  if (lower.includes('dewa') || lower.includes('addc') || lower.includes('electricity') || lower.includes('water bill') || lower.includes('gas bill')) {
    category = 'Utilities';
    subCategory = 'Electricity & Water';
    merchant = lower.includes('dewa') ? 'DEWA Dubai' : lower.includes('addc') ? 'ADDC Abu Dhabi' : 'Home Utility Bill';
  } else if (lower.includes('green island')) {
    category = 'School';
    subCategory = 'Tuition Fee';
    merchant = 'Green Island School';
    if (amount === 0) amount = 12525;
  } else if (lower.includes('asghar') || lower.includes('van')) {
    category = 'Van';
    subCategory = 'School Transport';
    merchant = 'Asghar Bhai Van';
    if (amount === 0) amount = 3500;
  } else if (lower.includes('grocery') || lower.includes('groceries') || lower.includes('imtiaz') || lower.includes('lulu') || lower.includes('carrefour')) {
    category = 'Grocery';
    subCategory = 'Supermarket';
    merchant = lower.includes('imtiaz') ? 'Imtiaz Super Market' : lower.includes('lulu') ? 'Lulu Hypermarket' : lower.includes('carrefour') ? 'Carrefour' : 'Grocery Shopping';
  } else if (lower.includes('petrol') || lower.includes('fuel') || lower.includes('pso') || lower.includes('shell')) {
    category = 'Petrol';
    subCategory = 'Fuel';
    merchant = lower.includes('shell') ? 'Shell Fuel' : 'PSO Petrol Station';
  } else if (lower.includes('stromfiber') || lower.includes('internet') || lower.includes('wifi')) {
    category = 'Bill Payment';
    subCategory = 'Internet';
    merchant = 'StromFiber Internet';
  } else if (lower.includes('maulana') || lower.includes('welfare') || lower.includes('charity') || lower.includes('sadaqah')) {
    category = 'Donation';
    subCategory = 'Religious & Welfare';
    merchant = lower.includes('qalbe ali') ? 'Maulana Qalbe Ali' : lower.includes('lutf') ? 'Maulana Lutf Latif' : 'Charity & Donation';
  } else {
    merchant = clean.slice(0, 45);
  }

  return {
    rawTranscript: clean,
    amount,
    currency,
    direction,
    category,
    subCategory,
    merchantOrRecipient: merchant,
    inferredAccountId,
    destinationAccountId,
    confidence: amount > 0 ? 'HIGH' : 'MEDIUM'
  };
}
