import { db, recalculateAllAccountBalances } from '../db/db';
import { RosterItem, RosterBatchDraftItem, Transaction } from '../types';
import { convertToPKR } from './fxService';

function addMonthsToYM(ym: string, count: number): string {
  const parts = ym.split('-');
  if (parts.length < 2) return ym;
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) + count;
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

export async function getActiveRosterItems(): Promise<RosterItem[]> {
  return await db.roster_items.where('isActive').equals(1).toArray()
    .catch(async () => {
      const all = await db.roster_items.toArray();
      return all.filter(item => item.isActive);
    });
}

export async function generateMonthlyRosterDraft(monthStr: string): Promise<RosterBatchDraftItem[]> {
  const [allItems, allTxs] = await Promise.all([
    db.roster_items.toArray(),
    db.transactions.toArray()
  ]);
  const activeItems = allItems.filter(i => i.isActive);

  // Find all active prepaid records
  const prepaidTxs = allTxs.filter(t => t.prepaidUntilMonth && t.prepaidUntilMonth >= monthStr);

  return activeItems.map(item => {
    const alreadyCommitted = item.lastCommittedMonth === monthStr;
    const itemNameLower = item.name.toLowerCase();

    // Check if this beneficiary is prepaid for monthStr from a prior transaction
    const matchingPrepaid = prepaidTxs.find(t => {
      const merch = (t.merchantOrRecipient || '').toLowerCase();
      const subBen = (t.subBeneficiary || '').toLowerCase();
      return merch.includes(itemNameLower) || itemNameLower.includes(merch) || (subBen && itemNameLower.includes(subBen));
    });

    const isPrepaid = Boolean(matchingPrepaid);

    return {
      ...item,
      selected: !alreadyCommitted && !isPrepaid, // Auto-toggle OFF if prepaid!
      adjustedAmount: item.defaultAmount,
      monthsCovered: 1,
      isPrepaidSkipped: isPrepaid,
      adjustmentNote: isPrepaid 
        ? `Prepaid in prior month through ${matchingPrepaid?.prepaidUntilMonth} ✅`
        : undefined
    };
  });
}

export async function executeRosterCommit(
  monthStr: string,
  items: RosterBatchDraftItem[]
): Promise<{ count: number; totalPKR: number }> {
  const transactionsToCreate: Transaction[] = [];
  let totalPKR = 0;

  for (const item of items) {
    if (!item.selected) continue;

    const dayStr = String(item.defaultDay || 1).padStart(2, '0');
    const txDate = `${monthStr}-${dayStr}`;

    const monthsCovered = item.monthsCovered || 1;
    const finalAmount = item.adjustedAmount * monthsCovered;

    const converted = await convertToPKR(finalAmount, item.currency);
    totalPKR += converted.amountPKR;

    const formulaNote = monthsCovered > 1 
      ? `${monthsCovered} months × ${item.defaultAmount.toLocaleString()} ${item.currency}`
      : undefined;

    const prepaidUntilMonth = monthsCovered > 1 
      ? addMonthsToYM(monthStr, monthsCovered - 1)
      : undefined;

    const tx: Transaction = {
      id: `roster-tx-${item.id}-${monthStr}-${Date.now()}`,
      date: txDate,
      type: item.category.toLowerCase().includes('income') ? 'INCOME' : 'EXPENSE',
      amount: finalAmount,
      currency: item.currency,
      convertedAmountPKR: converted.amountPKR,
      fxRateUsed: converted.fxRate,
      category: item.category,
      subCategory: item.subCategory,
      merchantOrRecipient: item.name,
      sourceAccountId: item.sourceAccountId,
      beneficiaryPhone: item.beneficiaryPhone,
      paymentChannel: item.paymentChannel,
      description: item.adjustmentNote 
        ? `[Batch ${monthStr}] ${item.adjustmentNote}` 
        : formulaNote 
        ? `Monthly roster: ${monthStr} (${formulaNote})`
        : `Monthly recurring roster: ${monthStr}`,
      status: 'CONFIRMED',
      rosterBatchMonth: monthStr,
      billingMonth: monthStr,
      monthsCovered,
      formulaNote,
      isPrepaid: monthsCovered > 1,
      prepaidUntilMonth,
      isKematiLockedSavings: item.subCategory?.toLowerCase() === 'kemati'
    };

    transactionsToCreate.push(tx);

    // Update roster item lastCommittedMonth and prepaid tag
    await db.roster_items.update(item.id, {
      lastCommittedMonth: monthStr,
      prepaidUntilMonth: prepaidUntilMonth || undefined
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

export async function addNewRosterItem(item: Omit<RosterItem, 'id'>): Promise<RosterItem> {
  const newItem: RosterItem = {
    ...item,
    id: `roster-${Date.now()}`
  };
  await db.roster_items.add(newItem);
  return newItem;
}

export async function updateRosterItem(id: string, updates: Partial<RosterItem>): Promise<void> {
  await db.roster_items.update(id, updates);
}

export async function deleteRosterItem(id: string): Promise<void> {
  await db.roster_items.delete(id);
}
