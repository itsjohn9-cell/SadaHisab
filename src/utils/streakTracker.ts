/**
 * Sada Hisaab — Expense Logging Streak & Habit Tracker
 * 
 * Reusable gamification blueprint adapted from Karachi Runner career milestones
 * for promoting daily financial discipline and preventing logging backlogs.
 * 
 * Operates 100% locally with zero cloud dependencies.
 */

import { Transaction } from '../types';

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  loggedToday: boolean;
  badgeTitle: string;
}

export function calculateLoggingStreak(transactions: Transaction[]): StreakInfo {
  if (!transactions || transactions.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      loggedToday: false,
      badgeTitle: 'Starter'
    };
  }

  // Collect unique ISO dates (YYYY-MM-DD)
  const uniqueDates = new Set<string>();
  for (const tx of transactions) {
    if (tx.date) {
      const d = tx.date.slice(0, 10);
      uniqueDates.add(d);
    }
  }

  const today = new Date();
  const formatYMD = (date: Date) => date.toISOString().slice(0, 10);

  const todayStr = formatYMD(today);
  const loggedToday = uniqueDates.has(todayStr);

  let currentStreak = 0;
  let checkDate = new Date(today);

  // If not logged today yet, streak can continue from yesterday
  if (!loggedToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const ymd = formatYMD(checkDate);
    if (uniqueDates.has(ymd)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Retrieve or update longest streak in localStorage
  let longestStreak = currentStreak;
  try {
    const saved = localStorage.getItem('sada_logging_streak_longest');
    const prevLongest = saved ? parseInt(saved, 10) || 0 : 0;
    if (currentStreak > prevLongest) {
      longestStreak = currentStreak;
      localStorage.setItem('sada_logging_streak_longest', String(longestStreak));
    } else {
      longestStreak = prevLongest;
    }
  } catch {}

  // Badge mapping
  let badgeTitle = 'Starter';
  if (currentStreak >= 30) badgeTitle = '👑 Legend (30d+)';
  else if (currentStreak >= 14) badgeTitle = '⚡ Master (14d+)';
  else if (currentStreak >= 7) badgeTitle = '🔥 On Fire (7d+)';
  else if (currentStreak >= 3) badgeTitle = '✨ Consistent (3d+)';
  else if (currentStreak >= 1) badgeTitle = '🌱 Active';

  return {
    currentStreak,
    longestStreak,
    loggedToday,
    badgeTitle
  };
}
