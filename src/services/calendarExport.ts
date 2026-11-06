import { RosterItem } from '../types';

/**
 * Generates an RFC 5545 compliant iCalendar (.ics) string for recurring roster items
 * or single events, compatible with Google Calendar, Apple Calendar, and Microsoft Outlook.
 */
export function generateRosterICS(items: RosterItem[], options?: { calendarName?: string }): string {
  const calendarName = options?.calendarName || 'Sada Hisab - Financial Roster';
  const now = new Date();
  const timestamp = formatDateToICS(now);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sada Hisab//Financial Management & Khums//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(calendarName)}`,
    'X-WR-TIMEZONE:Asia/Dubai',
  ];

  for (const item of items) {
    if (!item.isActive) continue;

    const dueDay = Math.min(Math.max(item.defaultDay || 1, 1), 28); // Safe day of month across Feb
    const eventYear = now.getFullYear();
    const eventMonth = now.getMonth(); // current month

    // Create start date at 09:00 AM on the due day
    const startDate = new Date(eventYear, eventMonth, dueDay, 9, 0, 0);
    const endDate = new Date(eventYear, eventMonth, dueDay, 9, 30, 0);

    const uid = `sada-hisab-roster-${item.id}-${dueDay}@sadahisab.local`;
    const dtStart = formatDateToICS(startDate);
    const dtEnd = formatDateToICS(endDate);

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${timestamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeICS(`[Due] ${item.name} - ${item.defaultAmount.toLocaleString()} ${item.currency}`)}`,
      `DESCRIPTION:${escapeICS(
        `Category: ${item.category}${item.subCategory ? ` / ${item.subCategory}` : ''}\n` +
        `Amount: ${item.defaultAmount.toLocaleString()} ${item.currency}\n` +
        `Type: ${item.reminderType || 'ROSTER'}\n` +
        `Account: ${item.sourceAccountId || 'Default'}\n` +
        (item.notes ? `Notes: ${item.notes}\n` : '') +
        `Managed in Sada Hisab local accounting app.`
      )}`,
      `CATEGORIES:${escapeICS(item.category)}`,
      `RRULE:FREQ=MONTHLY;BYMONTHDAY=${dueDay}`,
      'STATUS:CONFIRMED',
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'TRIGGER:-PT1D', // 1 day before reminder
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeICS(`Upcoming payment tomorrow: ${item.name} (${item.defaultAmount} ${item.currency})`)}`,
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:PT0S', // At time of event
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeICS(`Payment due today: ${item.name} (${item.defaultAmount} ${item.currency})`)}`,
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers a browser download of the generated .ics file
 */
export function downloadICS(content: string, filename = 'sada_hisab_recurring_bills.ics'): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDateToICS(date: Date): string {
  const pad = (n: number) => (n < 10 ? '0' + n : String(n));
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function escapeICS(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}
