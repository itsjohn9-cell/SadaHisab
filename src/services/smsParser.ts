import { db, incrementBlockedOTPCounter } from '../db/db';
import { Currency, TransactionType, ParsedSMSResult, MerchantRule } from '../types';
import { extractPakistaniPhone, extractPaymentChannel } from './excelHealer';

// Hard OTP & Security Firewall regex
const OTP_SECURITY_FIREWALL_REGEX = /\b(OTP|one[- ]time|verification code|security code|passcode|PIN|do not share|code is|is your code|secret code)\b/i;

// Petrol / Fuel pattern: extracts Liters and Price per Liter (e.g. 45.2L @ 280 or 40.00 Litres at 285.5)
export function extractFuelDetails(text: string): { liters?: number; pricePerLiter?: number } | undefined {
  let liters: number | undefined;
  let pricePerLiter: number | undefined;

  // Match liters: e.g. "42.50 L", "35.2 Litres", "50 Ltr", "25.0L"
  const literMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:L|liters?|litres?|ltrs?)\b/i);
  if (literMatch) {
    liters = parseFloat(literMatch[1]);
  }

  // Match price per liter: e.g. "@ 280", "at 275.5", "rate 282", "Rs. 280/L"
  const priceMatch = text.match(/(?:@|at|rate|price|\/L)\s*(?:Rs\.?|PKR)?\s*(\d+(?:\.\d+)?)/i);
  if (priceMatch) {
    pricePerLiter = parseFloat(priceMatch[1]);
  }

  if (liters !== undefined || pricePerLiter !== undefined) {
    return { liters, pricePerLiter };
  }
  return undefined;
}

// Single SMS / notification parser with OTP Firewall
export async function parseSMSMessage(rawText: string): Promise<ParsedSMSResult> {
  const trimmed = rawText.trim();

  // 1. HARD OTP & SECURITY FIREWALL CHECK (First Line of Defense)
  if (OTP_SECURITY_FIREWALL_REGEX.test(trimmed)) {
    // Instantly scrub from memory and increment security counter
    await incrementBlockedOTPCounter();
    return {
      rawText: '[SCRUBBED BY OTP FIREWALL]',
      isOTPBlocked: true,
      blockedReason: 'OTP / Security verification code intercepted. Wiped from memory to prevent leakage.',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      currency: 'PKR',
      direction: 'EXPENSE',
      merchantOrRecipient: 'BLOCKED OTP CREDENTIAL',
      category: 'Security Alert',
      confidence: 'HIGH',
      ruleApplied: 'OTP_SECURITY_FIREWALL'
    };
  }

  // Fetch active merchant adaptive rules from local database
  const merchantRules: MerchantRule[] = await db.merchant_rules.toArray();

  let currency: Currency = 'PKR';
  let amount = 0;
  let direction: TransactionType = 'EXPENSE';
  let inferredAccountId = 'al-habib-pkr';
  let merchant = 'Unknown Merchant';
  let category = 'General Expense';
  let subCategory: string | undefined;
  let ruleApplied = 'Generic Heuristic';
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  let txDate = new Date().toISOString().split('T')[0];

  const lower = trimmed.toLowerCase();

  // 2. Extract Date (Formats: DD/MM/YYYY, DD-MM-YYYY, DD-MON-YY, YYYY-MM-DD)
  const dateMatch = trimmed.match(/(\d{1,2})[\/\.-](\d{1,2}|\w{3})[\/\.-](\d{2,4})/);
  if (dateMatch) {
    try {
      const parsed = Date.parse(dateMatch[0]);
      if (!isNaN(parsed)) {
        txDate = new Date(parsed).toISOString().split('T')[0];
      }
    } catch {
      // keep current date
    }
  }

  // 3. Extract Amount & Currency
  // Matches "AED 365.87", "PKR 12,525", "Rs. 3,500.00", "$1,800.00", "USD 450", "dh 63.11", "dn 470.27"
  const amountMatch = trimmed.match(/(?:AED|AED\.|dh|dn|PKR|Rs\.?|USD|\$|GBP|£|SAR|MYR|IQD)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i)
    || trimmed.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:AED|dh|dn|PKR|Rs|USD|GBP|SAR)/i);

  if (amountMatch) {
    const rawAmt = amountMatch[1].replace(/,/g, '');
    amount = parseFloat(rawAmt) || 0;

    const matchedStr = amountMatch[0].toLowerCase();
    if (matchedStr.includes('aed') || matchedStr.includes('dh') || matchedStr.includes('dn')) {
      currency = 'AED';
    } else if (matchedStr.includes('usd') || matchedStr.includes('$')) {
      currency = 'USD';
    } else if (matchedStr.includes('gbp') || matchedStr.includes('£')) {
      currency = 'GBP';
    } else if (matchedStr.includes('sar')) {
      currency = 'SAR';
    } else if (matchedStr.includes('myr')) {
      currency = 'MYR';
    } else if (matchedStr.includes('iqd')) {
      currency = 'IQD';
    } else {
      currency = 'PKR';
    }
  }

  // 4. Determine Direction (Income, Expense, Transfer)
  if (lower.includes('credited') || lower.includes('received') || lower.includes('deposit') || lower.includes('added to your')) {
    direction = 'INCOME';
  } else if (lower.includes('transferred to') || lower.includes('sent to') || lower.includes('transfer:')) {
    direction = 'TRANSFER';
  } else {
    direction = 'EXPENSE';
  }

  // 5. Multi-Bank Declarative Identification

  // UAE: ADCB
  if (lower.includes('adcb')) {
    confidence = 'HIGH';
    ruleApplied = 'UAE_ADCB_PARSER';
    if (lower.includes('cr.card') || lower.includes('credit card') || lower.includes('card ending')) {
      direction = 'CREDIT_CARD_SWIPE';
      inferredAccountId = 'credit-card-aed';
    } else {
      inferredAccountId = 'adcb-aed';
    }
    currency = 'AED';

    // Merchant extraction for ADCB
    // e.g. "was used for AED 365.87 at Lulu Hypermarket on ..."
    const atMatch = trimmed.match(/(?:at|for|to)\s+([A-Za-z0-9\s\.\&\-\+]+?)(?:\s+on|\s+at|\s+ref|\.|\,|$)/i);
    if (atMatch && atMatch[1].trim().length > 2) {
      merchant = atMatch[1].trim();
    }
  }

  // UAE: ENBD
  else if (lower.includes('emirates nbd') || lower.includes('enbd')) {
    confidence = 'HIGH';
    ruleApplied = 'UAE_ENBD_PARSER';
    currency = 'AED';
    inferredAccountId = 'adcb-aed';
    const atMatch = trimmed.match(/(?:at|to)\s+([A-Za-z0-9\s\.\&\-\+]+?)(?:\s+on|\.|$)/i);
    if (atMatch) merchant = atMatch[1].trim();
  }

  // UAE: Salik & RTA
  else if (lower.includes('salik') || lower.includes('rta')) {
    confidence = 'HIGH';
    currency = 'AED';
    category = 'Transport';
    subCategory = lower.includes('salik') ? 'Toll Gate' : 'Public Parking';
    merchant = lower.includes('salik') ? 'Salik Toll Recharge' : 'RTA Dubai Parking';
    inferredAccountId = 'credit-card-aed';
    ruleApplied = 'UAE_TRANSPORT_PARSER';
  }

  // Pakistan: Bank AL Habib
  else if (lower.includes('bank al habib') || lower.includes('al habib') || lower.includes('bahl')) {
    confidence = 'HIGH';
    ruleApplied = 'PK_AL_HABIB_PARSER';
    currency = 'PKR';
    inferredAccountId = 'al-habib-pkr';

    // e.g. "...debited from your A/C ... to Green Island Foundation on 05-NOV-26"
    const toMatch = trimmed.match(/(?:to|at|paid to)\s+([A-Za-z0-9\s\.\&\-\+]+?)(?:\s+on|\s+via|\s+ref|\.|$)/i);
    if (toMatch && toMatch[1].trim().length > 2) {
      merchant = toMatch[1].trim();
    }
  }

  // Pakistan: Standard Chartered (SCB)
  else if (lower.includes('standard chartered') || lower.includes('scb')) {
    confidence = 'HIGH';
    ruleApplied = 'PK_SCB_PARSER';
    currency = 'PKR';
    inferredAccountId = 'scb-pkr';
    const atMatch = trimmed.match(/(?:at|for|to)\s+([A-Za-z0-9\s\.\&\-\+]+?)(?:\s+on|\.|$)/i);
    if (atMatch) merchant = atMatch[1].trim();
  }

  // Pakistan: HBL
  else if (lower.includes('hbl') || lower.includes('habib bank limited')) {
    confidence = 'HIGH';
    ruleApplied = 'PK_HBL_PARSER';
    currency = 'PKR';
    inferredAccountId = 'hbl-pkr';
    const toMatch = trimmed.match(/(?:to|at)\s+([A-Za-z0-9\s\.\&\-\+]+?)(?:\s+on|\.|$)/i);
    if (toMatch) merchant = toMatch[1].trim();
  }

  // Pakistan: NayaPay
  else if (lower.includes('nayapay')) {
    confidence = 'HIGH';
    ruleApplied = 'PK_NAYAPAY_PARSER';
    currency = 'PKR';
    inferredAccountId = 'nayapay-pkr';
    const toMatch = trimmed.match(/(?:to|paid to|at)\s+([A-Za-z0-9\s\.\&\-\+]+?)(?:\s+with|\s+from|\.|$)/i);
    if (toMatch) merchant = toMatch[1].trim();
  }

  // Pakistan: Easypaisa
  else if (lower.includes('easypaisa')) {
    confidence = 'HIGH';
    ruleApplied = 'PK_EASYPAISA_PARSER';
    currency = 'PKR';
    inferredAccountId = 'easypaisa-pkr';
    const toMatch = trimmed.match(/(?:sent to|paid to|to)\s+([A-Za-z0-9\s\.\&\-\+\(\)]+?)(?:\s+from|\s+on|\.|$)/i);
    if (toMatch) merchant = toMatch[1].trim();
  }

  // Pakistan: JazzCash
  else if (lower.includes('jazzcash') || lower.includes('jazz cash')) {
    confidence = 'HIGH';
    ruleApplied = 'PK_JAZZCASH_PARSER';
    currency = 'PKR';
    inferredAccountId = 'jazzcash-pkr';
    const toMatch = trimmed.match(/(?:transferred to|to)\s+([A-Za-z0-9\s\.\&\-\+]+?)(?:\.|\s+fee|\s+trans|\s+tid|$)/i);
    if (toMatch) merchant = toMatch[1].trim();
  }

  // Global: Wise / PayPal / Payoneer
  else if (lower.includes('wise')) {
    confidence = 'HIGH';
    ruleApplied = 'INTL_WISE_PARSER';
    currency = 'USD';
    inferredAccountId = 'wise-usd';
    const fromMatch = trimmed.match(/(?:from|to)\s+([A-Za-z0-9\s\.\&\-\+]+?)(?:\s+on|\.|$)/i);
    if (fromMatch) merchant = fromMatch[1].trim();
  } else if (lower.includes('paypal')) {
    confidence = 'HIGH';
    ruleApplied = 'INTL_PAYPAL_PARSER';
    currency = 'USD';
    inferredAccountId = 'paypal-usd';
    const fromMatch = trimmed.match(/(?:from|to)\s+([A-Za-z0-9\s\.\&\-\+]+?)(?:\s+via|\.|$)/i);
    if (fromMatch) merchant = fromMatch[1].trim();
  } else if (lower.includes('payoneer')) {
    confidence = 'HIGH';
    ruleApplied = 'INTL_PAYONEER_PARSER';
    currency = 'USD';
    inferredAccountId = 'payoneer-usd';
    const fromMatch = trimmed.match(/(?:from|to)\s+([A-Za-z0-9\s\.\&\-\+]+?)(?:\s+has|\.|$)/i);
    if (fromMatch) merchant = fromMatch[1].trim();
  }

  // Extract Pakistani phone number if present
  const extractedPhone = extractPakistaniPhone(trimmed);
  const extractedChannel = extractPaymentChannel(trimmed);

  // Extract Fuel / Petrol Liters if present (PSO, Shell, etc.)
  const fuelDetails = extractFuelDetails(trimmed);
  if (fuelDetails || lower.includes('pso') || lower.includes('petrol') || lower.includes('fuel') || lower.includes('shell')) {
    category = 'Petrol';
    subCategory = 'Fuel';
    if (merchant === 'Unknown Merchant') merchant = 'PSO Petrol Station';
  }

  // 6. Adaptive Rules Matching (Checks learned rules & workbook rules)
  for (const rule of merchantRules) {
    if (trimmed.toLowerCase().includes(rule.keyword.toLowerCase())) {
      category = rule.category;
      if (rule.subCategory) subCategory = rule.subCategory;
      if (rule.defaultAccountId) inferredAccountId = rule.defaultAccountId;
      if (merchant === 'Unknown Merchant') merchant = rule.keyword;
      ruleApplied = `ADAPTIVE_RULE: ${rule.keyword}`;
      confidence = 'HIGH';
      break;
    }
  }

  // Fallback cleanup of merchant name
  if (merchant === 'Unknown Merchant' && trimmed.length > 0) {
    merchant = trimmed.slice(0, 45).replace(/\n/g, ' ');
  }

  return {
    rawText: trimmed,
    isOTPBlocked: false,
    date: txDate,
    amount,
    currency,
    direction,
    inferredAccountId,
    merchantOrRecipient: merchant,
    category,
    subCategory,
    beneficiaryPhone: extractedPhone,
    paymentChannel: extractedChannel,
    confidence,
    fuelDetails,
    ruleApplied
  };
}

// Bulk SMS / Receipt Parser
export async function parseBulkSMSMessages(rawBlock: string): Promise<ParsedSMSResult[]> {
  if (!rawBlock || !rawBlock.trim()) return [];

  // Split messages by double newlines or typical SMS separator lines
  const rawChunks = rawBlock
    .split(/\n\s*\n|---|\n(?=\b(?:Dear|Your|Rs\.|PKR|AED|Txn|SCB|ADCB|Paid|You have)\b)/i)
    .map(c => c.trim())
    .filter(c => c.length > 5);

  const results: ParsedSMSResult[] = [];
  for (const chunk of rawChunks) {
    const parsed = await parseSMSMessage(chunk);
    results.push(parsed);
  }

  return results;
}
