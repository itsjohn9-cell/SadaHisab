import { Currency } from '../types';

export function formatCurrency(amount: number, currency: Currency = 'PKR'): string {
  const rounded = Math.round(amount * 100) / 100;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(rounded);

  switch (currency) {
    case 'PKR':
      return `Rs ${formatted}`;
    case 'AED':
      return `AED ${formatted}`;
    case 'USD':
      return `$${formatted}`;
    case 'GBP':
      return `£${formatted}`;
    case 'SAR':
      return `SAR ${formatted}`;
    case 'MYR':
      return `RM ${formatted}`;
    case 'IQD':
      return `IQD ${formatted}`;
    default:
      return `${currency} ${formatted}`;
  }
}

export function formatCurrencyMasked(
  amount: number,
  currency: Currency = 'PKR',
  isMasked: boolean = false
): string {
  if (isMasked) {
    switch (currency) {
      case 'PKR': return 'Rs •••••••';
      case 'AED': return 'AED ••••••';
      case 'USD': return '$••••••';
      case 'GBP': return '£••••••';
      default: return `${currency} ••••••`;
    }
  }
  return formatCurrency(amount, currency);
}

export function formatNumberOnly(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatDatePretty(isoDate: string): string {
  if (!isoDate) return '-';
  try {
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return isoDate;
  } catch {
    return isoDate;
  }
}

