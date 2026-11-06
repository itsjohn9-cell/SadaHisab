import { db } from '../db/db';
import { KhumsSnapshot } from '../types';
import { getFXRateFor } from './fxService';

export interface KhumsInputParameters {
  year: number;
  cutoffDate: string; // YYYY-11-30
  totalSavingsPKR: number;
  unusedConsumables20PctPKR: number; // Consumables / perfumes
  newUnusedItems25PctPKR: number; // Unused items
  loansGivenReceivablesPKR: number; // e.g. 328,369 PKR family loan
  wifeAndCustodialSubtractPKR: number; // Excluded custodial cash
  pendingLiabilitiesCCSubtractPKR: number; // CC / loans taken
  priorYearKhumsedCapitalPKR: number; // Prior year purified capital deducted
  extraVoluntaryPKR: number;
  notes?: string;
}

export function computeKhums(params: KhumsInputParameters): KhumsSnapshot {
  const {
    year,
    cutoffDate,
    totalSavingsPKR,
    unusedConsumables20PctPKR,
    newUnusedItems25PctPKR,
    loansGivenReceivablesPKR,
    wifeAndCustodialSubtractPKR,
    pendingLiabilitiesCCSubtractPKR,
    priorYearKhumsedCapitalPKR,
    extraVoluntaryPKR,
    notes
  } = params;

  // Exact Islamic Nov 30 Formula:
  // Net Wealth = (Total Savings + 20% Items + 25% Items + Loans Given) - (Wife/Custodial Cash + Pending CC/Loans Taken + Prior Year Capital)
  const totalAssets = 
    Number(totalSavingsPKR || 0) + 
    Number(unusedConsumables20PctPKR || 0) + 
    Number(newUnusedItems25PctPKR || 0) + 
    Number(loansGivenReceivablesPKR || 0);

  const totalDeductions = 
    Number(wifeAndCustodialSubtractPKR || 0) + 
    Number(pendingLiabilitiesCCSubtractPKR || 0) + 
    Number(priorYearKhumsedCapitalPKR || 0);

  const netKhumsable = totalAssets - totalDeductions;
  const netKhumsableAmountPKR = Math.round(netKhumsable * 100) / 100;

  // 20% Khums due on net surplus wealth
  const khumsCalculated20PctPKR = netKhumsableAmountPKR > 0 
    ? Math.round(netKhumsableAmountPKR * 0.20 * 100) / 100 
    : 0;

  const totalPaid = Math.round((khumsCalculated20PctPKR + Number(extraVoluntaryPKR || 0)) * 100) / 100;

  return {
    year,
    cutoffDate: cutoffDate || `${year}-11-30`,
    totalSavingsPKR: Number(totalSavingsPKR || 0),
    unusedConsumables20PctPKR: Number(unusedConsumables20PctPKR || 0),
    newUnusedItems25PctPKR: Number(newUnusedItems25PctPKR || 0),
    loansGivenReceivablesPKR: Number(loansGivenReceivablesPKR || 0),
    wifeAndCustodialSubtractPKR: Number(wifeAndCustodialSubtractPKR || 0),
    pendingLiabilitiesCCSubtractPKR: Number(pendingLiabilitiesCCSubtractPKR || 0),
    priorYearKhumsedCapitalPKR: Number(priorYearKhumsedCapitalPKR || 0),
    netKhumsableAmountPKR,
    khumsCalculated20PctPKR,
    extraVoluntaryPKR: Number(extraVoluntaryPKR || 0),
    khumsPaidPKR: totalPaid,
    notes,
    isLocked: false
  };
}

// Generate live estimation for any year based on live account balances
export async function generateKhumsDraftFromAccounts(year: number): Promise<KhumsSnapshot> {
  const accounts = await db.accounts.toArray();
  
  let totalSavingsPKR = 0;
  let wifeAndCustodialPKR = 0;
  let ccLiabilityPKR = 0;

  for (const acc of accounts) {
    const rate = await getFXRateFor(acc.currency);
    const balancePKR = (acc.currentBalance || 0) * rate;

    if (acc.isCustodial) {
      // Wife or children funds
      wifeAndCustodialPKR += Math.max(0, balancePKR);
    } else if (acc.type === 'CREDIT_CARD' || balancePKR < 0) {
      // Liability (negative balance)
      ccLiabilityPKR += Math.abs(balancePKR);
    } else {
      // General savings
      totalSavingsPKR += balancePKR;
    }
  }

  // Find prior year's locked snapshot to determine priorYearKhumsedCapitalPKR
  const priorYearRecord = await db.khums_snapshots
    .where('year')
    .below(year)
    .reverse()
    .sortBy('year');

  let priorCapital = 0;
  if (priorYearRecord.length > 0) {
    const latestPrior = priorYearRecord[0];
    // Prior year capital is the net wealth that was already purified
    priorCapital = latestPrior.totalSavingsPKR - latestPrior.wifeAndCustodialSubtractPKR - latestPrior.pendingLiabilitiesCCSubtractPKR;
    if (priorCapital < 0) priorCapital = 0;
  }

  // Check if there is an existing snapshot for this year
  const existing = await db.khums_snapshots.get(year);
  if (existing) {
    return existing;
  }

  return computeKhums({
    year,
    cutoffDate: `${year}-11-30`,
    totalSavingsPKR: Math.round(totalSavingsPKR),
    unusedConsumables20PctPKR: 85000,
    newUnusedItems25PctPKR: 65000,
    loansGivenReceivablesPKR: 328369, // Default family loan receivable
    wifeAndCustodialSubtractPKR: Math.round(wifeAndCustodialPKR),
    pendingLiabilitiesCCSubtractPKR: Math.round(ccLiabilityPKR),
    priorYearKhumsedCapitalPKR: Math.round(priorCapital),
    extraVoluntaryPKR: 5000,
    notes: `Calculated Nov 30 ${year} accounting snapshot`
  });
}

export async function saveKhumsSnapshot(snapshot: KhumsSnapshot): Promise<void> {
  await db.khums_snapshots.put(snapshot);
}

