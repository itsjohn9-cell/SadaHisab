import { db, commitRosterBatch } from '../db/db';
import { RosterItem, RosterBatchDraftItem } from '../types';
import { convertToPKR } from './fxService';

export async function getActiveRosterItems(): Promise<RosterItem[]> {
  return await db.roster_items.where('isActive').equals(1).toArray()
    .catch(async () => {
      // Fallback if boolean index behaves differently
      const all = await db.roster_items.toArray();
      return all.filter(item => item.isActive);
    });
}

export async function generateMonthlyRosterDraft(monthStr: string): Promise<RosterBatchDraftItem[]> {
  const allItems = await db.roster_items.toArray();
  const activeItems = allItems.filter(i => i.isActive);

  return activeItems.map(item => {
    const alreadyCommitted = item.lastCommittedMonth === monthStr;
    return {
      ...item,
      selected: !alreadyCommitted, // Checked by default if not yet committed
      adjustedAmount: item.defaultAmount,
      adjustmentNote: undefined
    };
  });
}

export async function executeRosterCommit(
  monthStr: string,
  items: RosterBatchDraftItem[]
): Promise<{ count: number; totalPKR: number }> {
  return await commitRosterBatch(monthStr, items);
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

